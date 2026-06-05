# In-memory diagnostics store
from collections import deque

# Keep the last 100 diagnostic messages
diag_logs = deque(maxlen=100)

def log_diag(msg: str):
    import datetime
    timestamp = datetime.datetime.utcnow().isoformat()
    diag_logs.append(f"[{timestamp}] {msg}")

def get_diag_logs():
    return list(diag_logs)
