from __future__ import annotations

import os
from pathlib import Path

TEST_DB = Path("/tmp/recallops_test.db")

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["RECALLOPS_AUTO_SYNC"] = "false"
os.environ["HINDSIGHT_API_URL"] = ""
os.environ["GROQ_API_KEY"] = ""
os.environ["BAND_API_KEY"] = ""

if TEST_DB.exists():
    TEST_DB.unlink()

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
