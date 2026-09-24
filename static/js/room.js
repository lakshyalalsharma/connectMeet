/* ============================================================
   CONNECTMEET - MEETING ROOM JAVASCRIPT
   ============================================================ */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const roomCode =
    window.CONNECTMEET_CONFIG?.roomCode || "";

const rtcConfiguration = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};


/* ============================================================
   SOCKET.IO
   ============================================================ */

const socket = io({
    transports: ["polling"],
    upgrade: false
});


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const localVideo =
    document.getElementById("localVideo");

const remoteVideo =
    document.getElementById("remoteVideo");

const localVideoPlaceholder =
    document.getElementById("localVideoPlaceholder");

const remoteVideoPlaceholder =
    document.getElementById("remoteVideoPlaceholder");

const localParticipantName =
    document.getElementById("localParticipantName");

const remoteParticipantName =
    document.getElementById("remoteParticipantName");

const localParticipantAvatar =
    document.getElementById("localParticipantAvatar");

const localParticipantListName =
    document.getElementById("localParticipantListName");

const localMicIndicator =
    document.getElementById("localMicIndicator");

const remoteMicIndicator =
    document.getElementById("remoteMicIndicator");

const localParticipantMicState =
    document.getElementById("localParticipantMicState");

const participantList =
    document.getElementById("participantList");

const participantCount =
    document.getElementById("participantCount");

const connectionStatusDot =
    document.getElementById("connectionStatusDot");

const connectionStatusText =
    document.getElementById("connectionStatusText");

const videoErrorMessage =
    document.getElementById("videoErrorMessage");

const videoErrorText =
    document.getElementById("videoErrorText");

const retryMediaBtn =
    document.getElementById("retryMediaBtn");


/* ============================================================
   CONTROLS
   ============================================================ */

const toggleMicBtn =
    document.getElementById("toggleMicBtn");

const toggleCameraBtn =
    document.getElementById("toggleCameraBtn");

const micIcon =
    document.getElementById("micIcon");

const cameraIcon =
    document.getElementById("cameraIcon");

const toggleChatBtn =
    document.getElementById("toggleChatBtn");

const chatUnreadBadge =
    document.getElementById("chatUnreadBadge");

const leaveMeetingBtn =
    document.getElementById("leaveMeetingBtn");


/* ============================================================
   CHAT
   ============================================================ */

const chatPanel =
    document.getElementById("chatPanel");

const chatMessages =
    document.getElementById("chatMessages");

const chatForm =
    document.getElementById("chatForm");

const chatInput =
    document.getElementById("chatInput");


/* ============================================================
   NAME MODAL
   ============================================================ */

const nameModal =
    document.getElementById("nameModal");

const nameForm =
    document.getElementById("nameForm");

const displayNameInput =
    document.getElementById("displayName");

const nameError =
    document.getElementById("nameError");

const joinRoomBtn =
    document.getElementById("joinRoomBtn");


/* ============================================================
   LEAVE MODAL
   ============================================================ */

const leaveModal =
    document.getElementById("leaveModal");

const cancelLeaveBtn =
    document.getElementById("cancelLeaveBtn");

const confirmLeaveBtn =
    document.getElementById("confirmLeaveBtn");


/* ============================================================
   ROOM CODE
   ============================================================ */

const copyRoomCodeBtn =
    document.getElementById("copyRoomCodeBtn");

const roomCodeCopyMessage =
    document.getElementById("roomCodeCopyMessage");


/* ============================================================
   TOAST
   ============================================================ */

const roomToast =
    document.getElementById("roomToast");

const toastTitle =
    document.getElementById("toastTitle");

const toastMessage =
    document.getElementById("toastMessage");

const closeToastBtn =
    document.getElementById("closeToastBtn");


/* ============================================================
   APPLICATION STATE
   ============================================================ */

let localStream = null;

let localParticipantNameValue = "";

let remoteParticipantSid = null;

let remoteParticipantNameValue = "";

let peerConnection = null;

let pendingIceCandidates = [];

let isJoined = false;

let isLeaving = false;

let chatOpen = true;

let remoteParticipantExists = false;

// If camera/microphone permission is delayed or unavailable,
// remember the participant so WebRTC can start after media succeeds.
let pendingOfferParticipantSid = null;


/* ============================================================
   HELPER - SHOW NAME ERROR
   ============================================================ */

function showNameError(message) {

    if (!nameError) {
        return;
    }

    nameError.textContent = message;
    nameError.hidden = false;
}


/* ============================================================
   HELPER - HIDE NAME ERROR
   ============================================================ */

function hideNameError() {

    if (!nameError) {
        return;
    }

    nameError.textContent = "";
    nameError.hidden = true;
}


/* ============================================================
   HELPER - SET CONNECTION STATUS
   ============================================================ */

function setConnectionStatus(
    text,
    connected = false
) {

    if (connectionStatusText) {
        connectionStatusText.textContent = text;
    }

    if (connectionStatusDot) {

        connectionStatusDot.classList.toggle(
            "connected",
            connected
        );
    }
}


/* ============================================================
   HELPER - TOAST
   ============================================================ */

function showToast(
    title,
    message
) {

    if (!roomToast) {
        return;
    }

    if (toastTitle) {
        toastTitle.textContent = title;
    }

    if (toastMessage) {
        toastMessage.textContent = message;
    }

    roomToast.hidden = false;

    setTimeout(
        function () {

            if (roomToast) {
                roomToast.hidden = true;
            }

        },
        3500
    );
}


/* ============================================================
   CLOSE TOAST
   ============================================================ */

if (closeToastBtn) {

    closeToastBtn.addEventListener(
        "click",
        function () {

            if (roomToast) {
                roomToast.hidden = true;
            }

        }
    );
}


/* ============================================================
   HELPER - GET INITIAL
   ============================================================ */

function getInitial(name) {

    if (!name) {
        return "?";
    }

    return name
        .trim()
        .charAt(0)
        .toUpperCase();
}


/* ============================================================
   SHOW NAME MODAL
   ============================================================ */

function showNameModal() {

    if (!nameModal) {
        return;
    }

    nameModal.hidden = false;

    document.body.style.overflow = "hidden";

    setTimeout(
        function () {

            if (displayNameInput) {
                displayNameInput.focus();
            }

        },
        100
    );
}


/* ============================================================
   HIDE NAME MODAL
   ============================================================ */

function hideNameModal() {

    if (!nameModal) {
        return;
    }

    nameModal.hidden = true;

    document.body.style.overflow = "";
}


/* ============================================================
   LOCAL MEDIA
   ============================================================ */

async function initializeLocalMedia() {

    hideMediaError();

    try {

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Camera and microphone access is not supported by this browser."
            );
        }


        /* --------------------------------------------
           Request camera + microphone
        --------------------------------------------- */

        const stream =
            await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });


        localStream = stream;


        /* --------------------------------------------
           Attach stream to local video
        --------------------------------------------- */

        if (localVideo) {

            localVideo.srcObject =
                localStream;

            localVideo.muted = true;

            await localVideo.play().catch(
                function () {}
            );
        }


        updateLocalMediaUI();

        console.log(
            "Local camera/microphone initialized."
        );

        return true;

    }

    catch (error) {

        console.error(
            "getUserMedia error:",
            error
        );

        let message =
            "Unable to access your camera or microphone.";

        if (error.name === "NotAllowedError") {

            message =
                "Camera/microphone permission was denied. Please allow access and try again.";

        }
        else if (error.name === "NotFoundError") {

            message =
                "No camera or microphone was found on this device.";

        }
        else if (error.name === "NotReadableError") {

            message =
                "Your camera or microphone is already being used by another application.";

        }
        else if (error.name === "SecurityError") {

            message =
                "Camera/microphone access is blocked by the browser.";

        }

        showMediaError(message);

        return false;
    }
}


/* ============================================================
   MEDIA ERROR
   ============================================================ */

function showMediaError(message) {

    if (videoErrorText) {
        videoErrorText.textContent = message;
    }

    if (videoErrorMessage) {
        videoErrorMessage.hidden = false;
    }
}


/* ============================================================
   HIDE MEDIA ERROR
   ============================================================ */

function hideMediaError() {

    if (videoErrorMessage) {
        videoErrorMessage.hidden = true;
    }
}


/* ============================================================
   UPDATE LOCAL MEDIA UI
   ============================================================ */

function updateLocalMediaUI() {

    if (!localStream) {
        return;
    }

    const audioTrack =
        localStream.getAudioTracks()[0];

    const videoTrack =
        localStream.getVideoTracks()[0];


    const micEnabled =
        !!audioTrack &&
        audioTrack.enabled;

    const cameraEnabled =
        !!videoTrack &&
        videoTrack.enabled;


    /* --------------------------------------------
       Camera
    --------------------------------------------- */

    if (localVideoPlaceholder) {

        localVideoPlaceholder.hidden =
            cameraEnabled;
    }


    if (localVideo) {

        localVideo.style.display =
            cameraEnabled ? "block" : "none";
    }


    /* --------------------------------------------
       Microphone
    --------------------------------------------- */

    if (localMicIndicator) {

        localMicIndicator.classList.toggle(
            "muted",
            !micEnabled
        );
    }


    if (localParticipantMicState) {

        localParticipantMicState.className =
            micEnabled
                ? "fa-solid fa-microphone"
                : "fa-solid fa-microphone-slash";
    }


    /* --------------------------------------------
       Mic button
    --------------------------------------------- */

    if (micIcon) {

        micIcon.className =
            micEnabled
                ? "fa-solid fa-microphone"
                : "fa-solid fa-microphone-slash";
    }


    if (toggleMicBtn) {

        toggleMicBtn.title =
            micEnabled
                ? "Mute microphone"
                : "Unmute microphone";

        toggleMicBtn.setAttribute(
            "aria-label",
            micEnabled
                ? "Mute microphone"
                : "Unmute microphone"
        );
    }


    /* --------------------------------------------
       Camera button
    --------------------------------------------- */

    if (cameraIcon) {

        cameraIcon.className =
            cameraEnabled
                ? "fa-solid fa-video"
                : "fa-solid fa-video-slash";
    }


    if (toggleCameraBtn) {

        toggleCameraBtn.title =
            cameraEnabled
                ? "Turn camera off"
                : "Turn camera on";

        toggleCameraBtn.setAttribute(
            "aria-label",
            cameraEnabled
                ? "Turn camera off"
                : "Turn camera on"
        );
    }
}


/* ============================================================
   JOIN ROOM AFTER NAME
   ============================================================ */

async function joinMeetingRoom() {

    const name =
        displayNameInput
            ? displayNameInput.value.trim()
            : "";


    hideNameError();


    if (!name) {

        showNameError(
            "Please enter your name."
        );

        if (displayNameInput) {
            displayNameInput.focus();
        }

        return;
    }


    if (name.length > 40) {

        showNameError(
            "Name must be 40 characters or less."
        );

        return;
    }


    if (!socket.connected) {

        showNameError(
            "Connecting to the meeting server. Please try again in a moment."
        );

        return;
    }


    /* --------------------------------------------
       Disable join button
    --------------------------------------------- */

    if (joinRoomBtn) {

        joinRoomBtn.disabled = true;

        joinRoomBtn.dataset.originalText =
            joinRoomBtn.innerHTML;

        joinRoomBtn.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i>' +
            '<span>Joining...</span>';
    }


    /* --------------------------------------------
       Save participant name first
    --------------------------------------------- */

    localParticipantNameValue =
        name;


    /* --------------------------------------------
       Update local participant UI
    --------------------------------------------- */

    if (localParticipantName) {
        localParticipantName.textContent =
            name;
    }

    if (localParticipantListName) {
        localParticipantListName.textContent =
            name;
    }

    if (localParticipantAvatar) {
        localParticipantAvatar.textContent =
            getInitial(name);
    }


    /* --------------------------------------------
       IMPORTANT:
       Join the Socket.IO room BEFORE requesting
       camera/microphone permissions.

       This keeps the meeting room usable on
       mobile/tablet browsers where getUserMedia
       may be blocked on an HTTP LAN address.
    --------------------------------------------- */

    socket.emit(
        "join_room",
        {
            room_code: roomCode,
            name: name
        }
    );
}


/* ============================================================
   NAME FORM
   ============================================================ */

if (nameForm) {

    nameForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            joinMeetingRoom();
        }
    );
}


/* ============================================================
   RETRY MEDIA
   ============================================================ */

if (retryMediaBtn) {

    retryMediaBtn.addEventListener(
        "click",
        async function () {

            const success =
                await initializeLocalMedia();

            if (!success) {
                return;
            }


            showToast(
                "Camera & microphone",
                "Your media devices are ready."
            );


            /* ----------------------------------------
               If we joined the room while media was
               unavailable, start WebRTC now.
            ----------------------------------------- */

            if (
                isJoined &&
                pendingOfferParticipantSid
            ) {

                const targetSid =
                    pendingOfferParticipantSid;

                pendingOfferParticipantSid =
                    null;

                await createOffer(
                    targetSid
                );
            }
        }
    );
}


/* ============================================================
   CREATE PEER CONNECTION
   ============================================================ */

function createPeerConnection(
    targetSid
) {

    if (peerConnection) {
        return peerConnection;
    }


    console.log(
        "Creating RTCPeerConnection for:",
        targetSid
    );


    peerConnection =
        new RTCPeerConnection(
            rtcConfiguration
        );


    remoteParticipantSid =
        targetSid;


    /* --------------------------------------------
       Add local media tracks
    --------------------------------------------- */

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                function (track) {

                    peerConnection.addTrack(
                        track,
                        localStream
                    );

                }
            );
    }


    /* --------------------------------------------
       Receive remote media
    --------------------------------------------- */

    peerConnection.ontrack =
        function (event) {

            console.log(
                "Remote track received."
            );

            if (
                remoteVideo &&
                event.streams &&
                event.streams[0]
            ) {

                remoteVideo.srcObject =
                    event.streams[0];

                remoteVideo.style.display =
                    "block";

                if (remoteVideoPlaceholder) {
                    remoteVideoPlaceholder.hidden =
                        true;
                }

                remoteVideo.play().catch(
                    function () {}
                );
            }
        };


    /* --------------------------------------------
       ICE candidate
    --------------------------------------------- */

    peerConnection.onicecandidate =
        function (event) {

            if (
                !event.candidate ||
                !remoteParticipantSid
            ) {
                return;
            }


            socket.emit(
                "webrtc_ice_candidate",
                {
                    target:
                        remoteParticipantSid,

                    candidate:
                        event.candidate
                }
            );
        };


    /* --------------------------------------------
       Connection state
    --------------------------------------------- */

    peerConnection.onconnectionstatechange =
        function () {

            if (!peerConnection) {
                return;
            }

            const state =
                peerConnection.connectionState;


            console.log(
                "WebRTC connection state:",
                state
            );


            if (state === "connected") {

                setConnectionStatus(
                    "Connected",
                    true
                );

            }
            else if (
                state === "disconnected"
            ) {

                setConnectionStatus(
                    "Connection interrupted",
                    false
                );

            }
            else if (
                state === "failed"
            ) {

                setConnectionStatus(
                    "Connection failed",
                    false
                );

                showToast(
                    "Connection problem",
                    "The video connection could not be established."
                );

            }
            else if (
                state === "closed"
            ) {

                setConnectionStatus(
                    "Disconnected",
                    false
                );
            }
        };


    /* --------------------------------------------
       ICE connection state
    --------------------------------------------- */

    peerConnection.oniceconnectionstatechange =
        function () {

            if (!peerConnection) {
                return;
            }

            console.log(
                "ICE state:",
                peerConnection.iceConnectionState
            );
        };


    return peerConnection;
}


/* ============================================================
   CREATE OFFER
   ============================================================ */

async function createOffer(
    targetSid
) {

    try {

        const pc =
            createPeerConnection(
                targetSid
            );


        const offer =
            await pc.createOffer();


        await pc.setLocalDescription(
            offer
        );


        socket.emit(
            "webrtc_offer",
            {
                target: targetSid,
                offer: offer
            }
        );


        console.log(
            "WebRTC offer sent."
        );

    }

    catch (error) {

        console.error(
            "Offer creation failed:",
            error
        );

        showToast(
            "Video connection error",
            "Unable to start the video connection."
        );
    }
}


/* ============================================================
   HANDLE WEBRTC OFFER
   ============================================================ */

async function handleOffer(
    data
) {

    if (
        !data ||
        !data.offer ||
        !data.sender
    ) {
        return;
    }


    try {

        remoteParticipantSid =
            data.sender;


        const pc =
            createPeerConnection(
                data.sender
            );


        await pc.setRemoteDescription(
            new RTCSessionDescription(
                data.offer
            )
        );


        /* --------------------------------------------
           Add queued ICE candidates
        --------------------------------------------- */

        await flushPendingIceCandidates();


        const answer =
            await pc.createAnswer();


        await pc.setLocalDescription(
            answer
        );


        socket.emit(
            "webrtc_answer",
            {
                target: data.sender,
                answer: answer
            }
        );


        console.log(
            "WebRTC answer sent."
        );

    }

    catch (error) {

        console.error(
            "Offer handling failed:",
            error
        );

        showToast(
            "Video connection error",
            "Unable to accept the video connection."
        );
    }
}


/* ============================================================
   HANDLE WEBRTC ANSWER
   ============================================================ */

async function handleAnswer(
    data
) {

    if (
        !data ||
        !data.answer ||
        !data.sender ||
        !peerConnection
    ) {
        return;
    }


    try {

        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
                data.answer
            )
        );


        await flushPendingIceCandidates();


        console.log(
            "WebRTC answer received."
        );

    }

    catch (error) {

        console.error(
            "Answer handling failed:",
            error
        );
    }
}


/* ============================================================
   HANDLE ICE CANDIDATE
   ============================================================ */

async function handleIceCandidate(
    data
) {

    if (
        !data ||
        !data.candidate ||
        !data.sender
    ) {
        return;
    }


    remoteParticipantSid =
        data.sender;


    if (
        !peerConnection ||
        !peerConnection.remoteDescription
    ) {

        pendingIceCandidates.push(
            {
                sender: data.sender,
                candidate: data.candidate
            }
        );

        return;
    }


    try {

        await peerConnection.addIceCandidate(
            new RTCIceCandidate(
                data.candidate
            )
        );

    }

    catch (error) {

        console.error(
            "ICE candidate error:",
            error
        );
    }
}


/* ============================================================
   FLUSH PENDING ICE
   ============================================================ */

async function flushPendingIceCandidates() {

    if (
        !peerConnection ||
        !peerConnection.remoteDescription
    ) {
        return;
    }


    const candidates =
        pendingIceCandidates;


    pendingIceCandidates = [];


    for (
        const item of candidates
    ) {

        try {

            await peerConnection.addIceCandidate(
                new RTCIceCandidate(
                    item.candidate
                )
            );

        }

        catch (error) {

            console.error(
                "Queued ICE candidate error:",
                error
            );
        }
    }
}


/* ============================================================
   CLOSE PEER CONNECTION
   ============================================================ */

function closePeerConnection() {

    if (peerConnection) {

        try {
            peerConnection.close();
        }
        catch (error) {
            console.warn(error);
        }
    }

    peerConnection = null;

    remoteParticipantSid = null;

    pendingIceCandidates = [];


    if (remoteVideo) {
        remoteVideo.srcObject = null;
    }

    if (remoteVideo) {
        remoteVideo.style.display = "none";
    }

    if (remoteVideoPlaceholder) {
        remoteVideoPlaceholder.hidden = false;
    }
}/* ============================================================
   PARTICIPANT LIST - ADD REMOTE
   ============================================================ */

function addRemoteParticipant(
    sid,
    name
) {

    remoteParticipantExists = true;

    remoteParticipantSid =
        sid;

    remoteParticipantNameValue =
        name;


    if (remoteParticipantName) {
        remoteParticipantName.textContent =
            name;
    }


    updateParticipantCount();


    /* --------------------------------------------
       Remove existing remote list item
    --------------------------------------------- */

    const existing =
        document.querySelector(
            `[data-participant-sid="${CSS.escape(sid)}"]`
        );

    if (existing) {
        existing.remove();
    }


    if (!participantList) {
        return;
    }


    const item =
        document.createElement("div");

    item.className =
        "cm-participant-item";

    item.dataset.participantSid =
        sid;


    const avatar =
        document.createElement("div");

    avatar.className =
        "cm-participant-avatar";


    const avatarText =
        document.createElement("span");

    avatarText.textContent =
        getInitial(name);


    avatar.appendChild(
        avatarText
    );


    const details =
        document.createElement("div");

    details.className =
        "cm-participant-details";


    const strong =
        document.createElement("strong");

    strong.textContent =
        name;


    const small =
        document.createElement("span");

    small.textContent =
        "Participant";


    details.appendChild(
        strong
    );

    details.appendChild(
        small
    );


    const state =
        document.createElement("div");

    state.className =
        "cm-participant-state";


    const mic =
        document.createElement("i");

    mic.className =
        "fa-solid fa-microphone";


    state.appendChild(
        mic
    );


    item.appendChild(
        avatar
    );

    item.appendChild(
        details
    );

    item.appendChild(
        state
    );


    participantList.appendChild(
        item
    );
}


/* ============================================================
   PARTICIPANT LIST - REMOVE REMOTE
   ============================================================ */

function removeRemoteParticipant(
    sid
) {

    remoteParticipantExists = false;


    const item =
        document.querySelector(
            `[data-participant-sid="${CSS.escape(sid)}"]`
        );


    if (item) {
        item.remove();
    }


    if (
        remoteParticipantSid === sid
    ) {

        remoteParticipantSid =
            null;

        remoteParticipantNameValue =
            "";

        if (remoteParticipantName) {
            remoteParticipantName.textContent =
                "Participant";
        }

        closePeerConnection();
    }


    updateParticipantCount();
}


/* ============================================================
   PARTICIPANT COUNT
   ============================================================ */

function updateParticipantCount() {

    const count =
        remoteParticipantExists
            ? 2
            : 1;


    if (participantCount) {

        participantCount.textContent =
            count === 1
                ? "1 participant"
                : `${count} participants`;
    }
}


/* ============================================================
   SOCKET CONNECT
   ============================================================ */

socket.on(
    "connect",
    function () {

        console.log(
            "Socket connected:",
            socket.id
        );

        setConnectionStatus(
            "Connected to server",
            true
        );
    }
);


/* ============================================================
   SOCKET DISCONNECT
   ============================================================ */

socket.on(
    "disconnect",
    function () {

        console.log(
            "Socket disconnected."
        );

        if (!isLeaving) {

            setConnectionStatus(
                "Server disconnected",
                false
            );

            showToast(
                "Connection lost",
                "The meeting server connection was lost."
            );
        }
    }
);


/* ============================================================
   ROOM JOINED
   ============================================================ */

socket.on(
    "room_joined",
    async function (data) {

        console.log(
            "Room joined:",
            data
        );


        isJoined = true;

        hideNameModal();


        /* --------------------------------------------
           Restore join button state
        --------------------------------------------- */

        if (joinRoomBtn) {

            joinRoomBtn.disabled = false;

            if (joinRoomBtn.dataset.originalText) {
                joinRoomBtn.innerHTML =
                    joinRoomBtn.dataset.originalText;
            }
        }


        setConnectionStatus(
            "Joining meeting...",
            true
        );


        const existingParticipants =
            Array.isArray(
                data.existing_participants
            )
                ? data.existing_participants
                : [];


        /* --------------------------------------------
           Existing participant found
        --------------------------------------------- */

        if (
            existingParticipants.length > 0
        ) {

            const participant =
                existingParticipants[0];


            addRemoteParticipant(
                participant.sid,
                participant.name
            );


            /*
             * The NEW participant creates the offer.
             *
             * First make sure local media is ready.
             * If the browser blocks camera/mic access,
             * the room still stays open and the user
             * can retry later.
             */

            pendingOfferParticipantSid =
                participant.sid;


            const mediaReady =
                localStream
                    ? true
                    : await initializeLocalMedia();


            if (mediaReady) {

                const targetSid =
                    pendingOfferParticipantSid;

                pendingOfferParticipantSid =
                    null;

                await createOffer(
                    targetSid
                );

            }
            else {

                setConnectionStatus(
                    "Camera/mic unavailable",
                    false
                );

                showToast(
                    "Meeting joined",
                    "You are in the room. Allow camera and microphone access to start video."
                );
            }

        }

        else {

            /*
             * No participant yet.
             * We can still enter the room immediately.
             * Media initialization happens in the background
             * and does not block the room UI.
             */

            setConnectionStatus(
                "Waiting for participant",
                true
            );


            const mediaReady =
                localStream
                    ? true
                    : await initializeLocalMedia();


            if (!mediaReady) {

                setConnectionStatus(
                    "Waiting for participant · Camera/mic unavailable",
                    false
                );
            }
            else {

                setConnectionStatus(
                    "Waiting for participant",
                    true
                );
            }


            updateParticipantCount();
        }
    }
);


/* ============================================================
   PARTICIPANT JOINED
   ============================================================ */

socket.on(
    "participant_joined",
    function (data) {

        if (!data) {
            return;
        }


        console.log(
            "Participant joined:",
            data.name
        );


        addRemoteParticipant(
            data.sid,
            data.name
        );


        setConnectionStatus(
            "Connecting...",
            true
        );


        showToast(
            "Participant joined",
            `${data.name} joined the meeting.`
        );


        /*
         * IMPORTANT:
         *
         * Do NOT create an offer here.
         *
         * The newly joined participant receives
         * room_joined and creates the offer.
         */
    }
);


/* ============================================================
   PARTICIPANT LEFT
   ============================================================ */

socket.on(
    "participant_left",
    function (data) {

        if (!data) {
            return;
        }


        removeRemoteParticipant(
            data.sid
        );


        if (pendingOfferParticipantSid === data.sid) {
            pendingOfferParticipantSid = null;
        }


        setConnectionStatus(
            "Waiting for participant",
            true
        );


        showToast(
            "Participant left",
            `${data.name || "Participant"} left the meeting.`
        );
    }
);


/* ============================================================
   WEBRTC OFFER
   ============================================================ */

socket.on(
    "webrtc_offer",
    function (data) {

        handleOffer(data);
    }
);


/* ============================================================
   WEBRTC ANSWER
   ============================================================ */

socket.on(
    "webrtc_answer",
    function (data) {

        handleAnswer(data);
    }
);


/* ============================================================
   WEBRTC ICE
   ============================================================ */

socket.on(
    "webrtc_ice_candidate",
    function (data) {

        handleIceCandidate(data);
    }
);


/* ============================================================
   ROOM ERROR
   ============================================================ */

socket.on(
    "room_error",
    function (data) {

        const message =
            data?.message ||
            "Unable to join the meeting.";


        isJoined = false;
        pendingOfferParticipantSid = null;


        showNameError(
            message
        );


        if (joinRoomBtn) {

            joinRoomBtn.disabled = false;

            if (joinRoomBtn.dataset.originalText) {

                joinRoomBtn.innerHTML =
                    joinRoomBtn.dataset.originalText;
            }
        }


        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    function (track) {
                        track.stop();
                    }
                );

            localStream = null;
        }
    }
);


/* ============================================================
   MICROPHONE TOGGLE
   ============================================================ */

if (toggleMicBtn) {

    toggleMicBtn.addEventListener(
        "click",
        function () {

            if (!localStream) {

                showToast(
                    "Microphone unavailable",
                    "Your microphone is not initialized yet."
                );

                return;
            }


            const audioTracks =
                localStream.getAudioTracks();


            if (!audioTracks.length) {

                showToast(
                    "Microphone unavailable",
                    "No microphone track was found."
                );

                return;
            }


            audioTracks.forEach(
                function (track) {

                    track.enabled =
                        !track.enabled;
                }
            );


            updateLocalMediaUI();
        }
    );
}


/* ============================================================
   CAMERA TOGGLE
   ============================================================ */

if (toggleCameraBtn) {

    toggleCameraBtn.addEventListener(
        "click",
        function () {

            if (!localStream) {

                showToast(
                    "Camera unavailable",
                    "Your camera is not initialized yet."
                );

                return;
            }


            const videoTracks =
                localStream.getVideoTracks();


            if (!videoTracks.length) {

                showToast(
                    "Camera unavailable",
                    "No camera track was found."
                );

                return;
            }


            videoTracks.forEach(
                function (track) {

                    track.enabled =
                        !track.enabled;
                }
            );


            updateLocalMediaUI();
        }
    );
}/* ============================================================
   CHAT
   ============================================================ */

function addChatMessage(
    name,
    message
) {

    if (!chatMessages) {
        return;
    }


    /* --------------------------------------------
       Remove empty state
    --------------------------------------------- */

    const emptyState =
        chatMessages.querySelector(
            ".cm-chat-empty"
        );

    if (emptyState) {
        emptyState.remove();
    }


    const messageItem =
        document.createElement("div");

    messageItem.className =
        "cm-chat-message";


    if (
        name === localParticipantNameValue
    ) {

        messageItem.classList.add(
            "cm-chat-message-self"
        );
    }


    const nameElement =
        document.createElement("strong");

    nameElement.textContent =
        name;


    const messageElement =
        document.createElement("span");

    messageElement.textContent =
        message;


    messageItem.appendChild(
        nameElement
    );

    messageItem.appendChild(
        messageElement
    );


    chatMessages.appendChild(
        messageItem
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}


/* ============================================================
   CHAT SUBMIT
   ============================================================ */

if (chatForm) {

    chatForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            if (!chatInput) {
                return;
            }


            const message =
                chatInput.value.trim();


            if (!message) {
                return;
            }


            if (!isJoined) {

                showToast(
                    "Not connected",
                    "Join the meeting before sending messages."
                );

                return;
            }


            socket.emit(
                "chat_message",
                {
                    room_code: roomCode,
                    message: message
                }
            );


            chatInput.value = "";

            chatInput.focus();
        }
    );
}


/* ============================================================
   CHAT MESSAGE RECEIVED
   ============================================================ */

socket.on(
    "chat_message",
    function (data) {

        if (!data) {
            return;
        }


        addChatMessage(
            data.name || "Participant",
            data.message || ""
        );


        if (
            data.name !== localParticipantNameValue &&
            !chatOpen
        ) {

            if (chatUnreadBadge) {

                chatUnreadBadge.hidden =
                    false;
            }
        }
    }
);


/* ============================================================
   CHAT TOGGLE
   ============================================================ */

if (toggleChatBtn) {

    toggleChatBtn.addEventListener(
        "click",
        function () {

            chatOpen =
                !chatOpen;


            if (chatPanel) {

                chatPanel.classList.toggle(
                    "is-hidden",
                    !chatOpen
                );
            }


            if (chatOpen) {

                if (chatUnreadBadge) {
                    chatUnreadBadge.hidden = true;
                }

                if (chatInput) {
                    chatInput.focus();
                }
            }
        }
    );
}


/* ============================================================
   COPY ROOM CODE
   ============================================================ */

if (copyRoomCodeBtn) {

    copyRoomCodeBtn.addEventListener(
        "click",
        async function () {

            try {

                await navigator.clipboard.writeText(
                    roomCode
                );


                if (roomCodeCopyMessage) {

                    roomCodeCopyMessage.textContent =
                        "Copied!";

                    setTimeout(
                        function () {

                            roomCodeCopyMessage.textContent =
                                "";

                        },
                        1500
                    );
                }

            }

            catch (error) {

                console.error(
                    "Room code copy failed:",
                    error
                );
            }
        }
    );
}


/* ============================================================
   LEAVE MODAL
   ============================================================ */

if (leaveMeetingBtn) {

    leaveMeetingBtn.addEventListener(
        "click",
        function () {

            if (leaveModal) {
                leaveModal.hidden = false;
            }
        }
    );
}


if (cancelLeaveBtn) {

    cancelLeaveBtn.addEventListener(
        "click",
        function () {

            if (leaveModal) {
                leaveModal.hidden = true;
            }
        }
    );
}


/* ============================================================
   LEAVE MEETING
   ============================================================ */

function leaveMeeting() {

    if (isLeaving) {
        return;
    }


    isLeaving = true;


    /* --------------------------------------------
       Notify Flask
    --------------------------------------------- */

    if (
        socket.connected &&
        isJoined
    ) {

        socket.emit(
            "leave_room",
            {
                room_code: roomCode
            }
        );
    }


    /* --------------------------------------------
       Stop local camera + microphone
    --------------------------------------------- */

    if (localStream) {

        localStream
            .getTracks()
            .forEach(
                function (track) {
                    track.stop();
                }
            );

        localStream = null;
    }


    /* --------------------------------------------
       Close WebRTC
    --------------------------------------------- */

    closePeerConnection();


    /* --------------------------------------------
       Disconnect Socket.IO
    --------------------------------------------- */

    if (socket.connected) {
        socket.disconnect();
    }


    /* --------------------------------------------
       Return home
    --------------------------------------------- */

    window.location.href = "/";
}


if (confirmLeaveBtn) {

    confirmLeaveBtn.addEventListener(
        "click",
        leaveMeeting
    );
}


/* ============================================================
   BROWSER / TAB CLOSE
   ============================================================ */

window.addEventListener(
    "beforeunload",
    function () {

        if (
            socket.connected &&
            isJoined
        ) {

            socket.emit(
                "leave_room",
                {
                    room_code: roomCode
                }
            );
        }


        if (localStream) {

            localStream
                .getTracks()
                .forEach(
                    function (track) {
                        track.stop();
                    }
                );
        }
    }
);


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "ConnectMeet meeting room initialized."
        );

        console.log(
            "Room:",
            roomCode
        );


        /*
         * THIS IS IMPORTANT:
         *
         * The name modal is opened immediately.
         * Therefore BOTH browser A and browser B
         * must enter a name before joining.
         */

        showNameModal();

        updateParticipantCount();

        setConnectionStatus(
            "Connecting...",
            false
        );
    }
);