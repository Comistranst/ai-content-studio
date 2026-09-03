from pathlib import Path

import pytest


@pytest.fixture(autouse=True)
def use_test_database(monkeypatch, tmp_path):
    test_database_path = tmp_path / "ai_content_studio_test.db"

    import app.database as database

    monkeypatch.setattr(
        database,
        "DATABASE_PATH",
        Path(test_database_path),
    )

    database.init_database()