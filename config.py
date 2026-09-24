import os


class Config:
    """
    Central configuration for ConnectMeet.
    """

    # Flask secret key
    SECRET_KEY = os.environ.get(
        "SECRET_KEY",
        "connectmeet-development-secret-key"
    )

    # Socket.IO configuration
    SOCKETIO_ASYNC_MODE = "threading"

    # Application settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024