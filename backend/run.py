import os
import sys

def _check_and_run_venv():
    # Detect if we are already inside a virtual environment
    in_venv = (
        sys.prefix != sys.base_prefix 
        or "venv" in sys.prefix 
        or os.environ.get("VIRTUAL_ENV") is not None
    )
    
    if not in_venv:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        # Try Windows venv path
        venv_python = os.path.join(base_dir, "venv", "Scripts", "python.exe")
        # Try Unix venv path
        if not os.path.exists(venv_python):
            venv_python = os.path.join(base_dir, "venv", "bin", "python")
            
        if os.path.exists(venv_python):
            print(f"[INFO] Auto-relaunching backend using virtual environment: {venv_python}")
            import subprocess
            sys.exit(subprocess.call([venv_python] + sys.argv))

_check_and_run_venv()

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
