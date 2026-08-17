import sqlite3
from datetime import datetime
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "data" / "ai_content_studio.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def ensure_column(
    connection: sqlite3.Connection,
    column_name: str,
    column_definition: str,
) -> None:
    cursor = connection.execute(
        "PRAGMA table_info(generation_history)"
    )
    existing_columns = {
        row["name"]
        for row in cursor.fetchall()
    }

    if column_name not in existing_columns:
        connection.execute(
            f"ALTER TABLE generation_history "
            f"ADD COLUMN {column_definition}"
        )


def init_database():
    DATABASE_PATH.parent.mkdir(exist_ok=True)

    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS generation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic TEXT NOT NULL,
                platform TEXT NOT NULL,
                style TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        ensure_column(
            connection,
            "audience",
            "audience TEXT NOT NULL DEFAULT '普通用户'",
        )
        ensure_column(
            connection,
            "content_length",
            "content_length TEXT NOT NULL DEFAULT 'medium'",
        )


def save_generation(
    topic: str,
    platform: str,
    style: str,
    audience: str,
    content_length: str,
    content: str,
) -> int:
    created_at = datetime.now().isoformat(timespec="seconds")

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO generation_history (
                topic,
                platform,
                style,
                audience,
                content_length,
                content,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                topic,
                platform,
                style,
                audience,
                content_length,
                content,
                created_at,
            ),
        )
        return cursor.lastrowid


def get_generation_history(limit: int = 10, offset: int = 0):
    with get_connection() as connection:
        cursor = connection.execute(
            """
            SELECT
                id,
                topic,
                platform,
                style,
                audience,
                content_length,
                content,
                created_at
            FROM generation_history
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        )

        rows = cursor.fetchall()
        return [dict(row) for row in rows]


def delete_generation(generation_id: int) -> bool:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            DELETE FROM generation_history
            WHERE id = ?
            """,
            (generation_id,),
        )

        return cursor.rowcount > 0