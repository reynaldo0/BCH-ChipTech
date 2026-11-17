"""Run tests against a throwaway SQLite file so the demo database is never touched."""
import os
import tempfile
from pathlib import Path

_TEST_DB = Path(tempfile.gettempdir()) / "kompas_test.db"
if _TEST_DB.exists():
    _TEST_DB.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB.as_posix()}"
os.environ.setdefault("JEV_ENABLED", "false")
