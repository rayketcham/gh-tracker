"""Server configuration for gh-tracker backend."""

import os

DEFAULT_PORT = 50047


def get_server_port() -> int:
    """Return the configured server port.

    Reads GH_TRACKER_PORT from environment, defaulting to 50047
    (picked from the 50000+ range to avoid collisions with common
    dev servers like 3000/5000/5173/8000/8080).
    Raises ValueError if the env var is not a valid integer.
    """
    raw = os.environ.get("GH_TRACKER_PORT")
    if raw is None:
        return DEFAULT_PORT
    port = int(raw)  # raises ValueError on non-numeric
    return port
