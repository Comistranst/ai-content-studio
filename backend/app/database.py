import sqlite3
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "data" / "ai_content_studio.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


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


def save_generation(topic: str, platform: str, style: str, content: str):
    created_at = datetime.now().isoformat(timespec="seconds")

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO generation_history (
                topic, platform, style, content, created_at
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (topic, platform, style, content, created_at),
        )
        return cursor.lastrowid
def get_generation_history(limit: int = 10, offset: int = 0):
    with get_connection() as connection:
        cursor = connection.execute(
            """
            SELECT id, topic, platform, style, content, created_at
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