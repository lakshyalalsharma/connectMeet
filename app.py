from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_socketio import SocketIO, join_room, leave_room, emit
import secrets
import string

from config import Config
from utils.room_utils import (
    generate_room_code,
    is_valid_room_code
)


# ============================================================
# APPLICATION SETUP
# ============================================================

app = Flask(__name__)
app.config.from_object(Config)

socketio = SocketIO(
    app,
    cors_allowed_origins="*"
)


# ============================================================
# RUNTIME ROOM STORAGE
# ============================================================
# No database is being used.
#
# Example:
# rooms = {
#     "X7K9P2": {
#         "participants": {}
#     }
# }
#
# Everything exists only while Flask is running.

rooms = {}


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def room_exists(room_code):
    """Check whether a meeting room exists."""
    return room_code in rooms


def create_room():
    """Create and register a new meeting room."""

    room_code = generate_room_code()

    # Extremely unlikely collision, but keep checking.
    while room_code in rooms:
        room_code = generate_room_code()

    rooms[room_code] = {
        "participants": {}
    }

    return room_code


# ============================================================
# BASIC PAGE ROUTES
# ============================================================

@app.route("/")
def home():
    """Render homepage."""
    return render_template("index.html")




# ============================================================
# CREATE MEETING
# ============================================================

@app.route("/create-room", methods=["POST"])
def create_room_route():
    """
    Create a temporary meeting room.

    The room is stored only in Python memory.
    """

    room_code = create_room()

    return jsonify({
        "success": True,
        "room_code": room_code,
        "room_url": url_for(
            "meeting_room",
            room_code=room_code
        )
    })


# ============================================================
# JOIN MEETING
# ============================================================

@app.route("/join/<room_code>")
def join_meeting(room_code):
    """
    Validate a meeting code before entering the room.
    """

    room_code = room_code.upper().strip()

    # Validate format first.
    if not is_valid_room_code(room_code):
        return render_template(
            "index.html",
            error="Invalid meeting code."
        )

    # Check whether room actually exists.
    if not room_exists(room_code):
        return render_template(
            "index.html",
            error="Room not found. Please check the meeting code."
        )

    return redirect(
        url_for(
            "meeting_room",
            room_code=room_code
        )
    )


# ============================================================
# MEETING ROOM
# ============================================================

@app.route("/room/<room_code>")
def meeting_room(room_code):
    """
    Render the meeting room.

    The room must already exist.
    """

    room_code = room_code.upper().strip()

    if not is_valid_room_code(room_code):
        return redirect(url_for("home"))

    if not room_exists(room_code):
        return render_template(
            "index.html",
            error="Room not found. Please check the meeting code."
        )

    return render_template(
        "room.html",
        room_code=room_code
    )


# ============================================================
# SOCKET.IO CONNECTION
# ============================================================

@socketio.on("connect")
def handle_connect():
    """
    Called whenever a browser establishes
    a Socket.IO connection.
    """

    print("Client connected:", request.sid)


# ============================================================
# SOCKET.IO DISCONNECT
# ============================================================

@socketio.on("disconnect")
def handle_disconnect():
    """
    Called when a Socket.IO connection closes.
    """

    print("Client disconnected:", request.sid)


# ============================================================
# SOCKET.IO JOIN ROOM
# ============================================================

@socketio.on("join_room")
def handle_join_room(data):
    """
    Add a participant to a Socket.IO meeting room.

    Expected data:

    {
        "room_code": "X7K9P2",
        "name": "Lakshya"
    }
    """

    if not isinstance(data, dict):
        return

    room_code = str(
        data.get("room_code", "")
    ).upper().strip()

    name = str(
        data.get("name", "")
    ).strip()

    # --------------------------------------------
    # Validate room code
    # --------------------------------------------

    if not is_valid_room_code(room_code):
        emit("room_error", {
            "message": "Invalid meeting code."
        })
        return

    # --------------------------------------------
    # Check room existence
    # --------------------------------------------

    if not room_exists(room_code):
        emit("room_error", {
            "message": "Room not found."
        })
        return

    # --------------------------------------------
    # Validate display name
    # --------------------------------------------

    if not name:
        emit("room_error", {
            "message": "Please enter your name."
        })
        return

    # Keep names reasonably short.
    name = name[:40]

    # --------------------------------------------
    # Join Socket.IO room
    # --------------------------------------------

    join_room(room_code)

    # Store participant information.
    rooms[room_code]["participants"][request.sid] = {
        "name": name
    }

    # --------------------------------------------
    # Tell the new participant who is already there
    # --------------------------------------------

    existing_participants = []

    for sid, participant in rooms[room_code]["participants"].items():

        if sid == request.sid:
            continue

        existing_participants.append({
            "sid": sid,
            "name": participant["name"]
        })

    emit("room_joined", {
        "room_code": room_code,
        "name": name,
        "existing_participants": existing_participants
    })

    # --------------------------------------------
    # Notify everyone else
    # --------------------------------------------

    emit(
        "participant_joined",
        {
            "sid": request.sid,
            "name": name
        },
        to=room_code,
        include_self=False
    )

    print(
        f"{name} joined room {room_code}"
    )


# ============================================================
# SOCKET.IO LEAVE ROOM
# ============================================================

@socketio.on("leave_room")
def handle_leave_room(data):
    """
    Explicitly leave a meeting room.
    """

    if not isinstance(data, dict):
        return

    room_code = str(
        data.get("room_code", "")
    ).upper().strip()

    if not room_exists(room_code):
        return

    participant = rooms[room_code]["participants"].pop(
        request.sid,
        None
    )

    if participant is None:
        return

    name = participant["name"]

    leave_room(room_code)

    # Notify remaining participants.
    emit(
        "participant_left",
        {
            "sid": request.sid,
            "name": name
        },
        to=room_code
    )

    print(
        f"{name} left room {room_code}"
    )

    # --------------------------------------------
    # Delete empty room
    # --------------------------------------------

    if not rooms[room_code]["participants"]:
        del rooms[room_code]

        print(
            f"Room {room_code} deleted because it is empty."
        )


# ============================================================
# CHAT MESSAGE
# ============================================================

@socketio.on("chat_message")
def handle_chat_message(data):
    """
    Relay a realtime chat message to everyone
    inside the same meeting room.
    """

    if not isinstance(data, dict):
        return

    room_code = str(
        data.get("room_code", "")
    ).upper().strip()

    message = str(
        data.get("message", "")
    ).strip()

    # --------------------------------------------
    # Basic validation
    # --------------------------------------------

    if not room_exists(room_code):
        return

    if not message:
        return

    # Limit message length.
    message = message[:1000]

    # Find sender.
    participant = rooms[room_code]["participants"].get(
        request.sid
    )

    if participant is None:
        return

    name = participant["name"]

    # --------------------------------------------
    # Send message to room
    # --------------------------------------------

    emit(
        "chat_message",
        {
            "name": name,
            "message": message
        },
        to=room_code
    )


# ============================================================
# WEBRTC OFFER
# ============================================================

@socketio.on("webrtc_offer")
def handle_webrtc_offer(data):
    """
    Relay a WebRTC offer to another participant.

    Flask does NOT process the SDP.
    It simply forwards the signaling data.
    """

    if not isinstance(data, dict):
        return

    target_sid = data.get("target")

    if not target_sid:
        return

    emit(
        "webrtc_offer",
        {
            "offer": data.get("offer"),
            "sender": request.sid
        },
        to=target_sid
    )


# ============================================================
# WEBRTC ANSWER
# ============================================================

@socketio.on("webrtc_answer")
def handle_webrtc_answer(data):
    """
    Relay a WebRTC answer to another participant.
    """

    if not isinstance(data, dict):
        return

    target_sid = data.get("target")

    if not target_sid:
        return

    emit(
        "webrtc_answer",
        {
            "answer": data.get("answer"),
            "sender": request.sid
        },
        to=target_sid
    )


# ============================================================
# WEBRTC ICE CANDIDATE
# ============================================================

@socketio.on("webrtc_ice_candidate")
def handle_webrtc_ice_candidate(data):
    """
    Relay an ICE candidate to another participant.
    """

    if not isinstance(data, dict):
        return

    target_sid = data.get("target")

    if not target_sid:
        return

    emit(
        "webrtc_ice_candidate",
        {
            "candidate": data.get("candidate"),
            "sender": request.sid
        },
        to=target_sid
    )


# ============================================================
# APPLICATION START
# ============================================================

if __name__ == "__main__":

    print("=" * 55)
    print("CONNECTMEET")
    print("Web-Based Video Conferencing System")
    print("=" * 55)
    print("Server running at:")
    print("http://127.0.0.1:5000")
    print("http://localhost:5000")
    print("=" * 55)

    socketio.run(
        app,
        host="127.0.0.1",
        port=5000,
        debug=True
    )