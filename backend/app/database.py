import json
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
        ensure_column(
            connection,
            "title",
            "title TEXT",
        )
        ensure_column(
            connection,
            "body",
            "body TEXT",
        )
        ensure_column(
            connection,
            "hashtags",
            "hashtags TEXT",
        )

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic TEXT NOT NULL,
                platform TEXT NOT NULL,
                style TEXT NOT NULL,
                audience TEXT NOT NULL,
                content_length TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'drafting',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )


def save_generation(
    topic: str,
    platform: str,
    style: str,
    audience: str,
    content_length: str,
    title: str,
    body: str,
    hashtags: list[str],
    content: str,
) -> int:
    created_at = datetime.now().isoformat(timespec="seconds")
    hashtags_json = json.dumps(
        hashtags,
        ensure_ascii=False,
    )

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO generation_history (
                topic,
                platform,
                style,
                audience,
                content_length,
                title,
                body,
                hashtags,
                content,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                topic,
                platform,
                style,
                audience,
                content_length,
                title,
                body,
                hashtags_json,
                content,
                created_at,
            ),
        )
        return cursor.lastrowid


def get_generation_history(
    limit: int = 10,
    offset: int = 0,
) -> list[dict]:
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
                title,
                body,
                hashtags,
                content,
                created_at
            FROM generation_history
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (limit, offset),
        )

        records = []

        for row in cursor.fetchall():
            record = dict(row)

            try:
                record["hashtags"] = (
                    json.loads(record["hashtags"])
                    if record["hashtags"]
                    else []
                )
            except json.JSONDecodeError:
                record["hashtags"] = []

            records.append(record)

        return records


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


def create_project(
    topic: str,
    platform: str,
    style: str,
    audience: str,
    content_length: str,
) -> dict:
    now = datetime.now().isoformat(timespec="seconds")

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO projects (
                topic,
                platform,
                style,
                audience,
                content_length,
                status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, 'drafting', ?, ?)
            """,
            (
                topic,
                platform,
                style,
                audience,
                content_length,
                now,
                now,
            ),
        )

        project_id = cursor.lastrowid

        project = connection.execute(
            """
            SELECT
                id,
                topic,
                platform,
                style,
                audience,
                content_length,
                status,
                created_at,
                updated_at
            FROM projects
            WHERE id = ?
            """,
            (project_id,),
        ).fetchone()

        return dict(project)