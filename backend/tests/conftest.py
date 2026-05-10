"""
pytest configuration: set up a temporary SQLite database file for every
test session so that the lifespan DB setup works correctly.
"""
import os
import sys
import tempfile

# Set env vars BEFORE any other module import touches config.py
os.environ["SECRET_KEY"] = "test-secret-key-for-pytest-only"

_tmpfile = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmpfile.close()
# DATABASE_PATH must be absolute so db.py BASE_DIR / DATABASE_PATH resolves correctly
os.environ["DATABASE_PATH"] = _tmpfile.name

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Now it's safe to import the DB utilities and initialise the schema
import db as _db
_db.DB_PATH = _tmpfile.name   # override the module-level constant directly
_db.init_db()
_db.seed_recommended_and_core_data()
