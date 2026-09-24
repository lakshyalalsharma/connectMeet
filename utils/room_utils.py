import secrets
import string


# ============================================================
# ROOM CODE CONFIGURATION
# ============================================================

ROOM_CODE_LENGTH = 6

ROOM_CODE_CHARACTERS = (
    string.ascii_uppercase +
    string.digits
)


# ============================================================
# GENERATE ROOM CODE
# ============================================================

def generate_room_code():
    """
    Generate a random meeting room code.

    Example:
        X7K9P2
    """

    return "".join(
        secrets.choice(ROOM_CODE_CHARACTERS)
        for _ in range(ROOM_CODE_LENGTH)
    )


# ============================================================
# VALIDATE ROOM CODE
# ============================================================

def is_valid_room_code(room_code):
    """
    Validate the format of a meeting room code.

    A valid room code:
    - must be a string
    - must contain exactly 6 characters
    - must contain only uppercase letters and numbers
    """

    if not isinstance(room_code, str):
        return False

    room_code = room_code.strip().upper()

    if len(room_code) != ROOM_CODE_LENGTH:
        return False

    if not all(
        character in ROOM_CODE_CHARACTERS
        for character in room_code
    ):
        return False

    return True