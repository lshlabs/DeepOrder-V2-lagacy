from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _connect_args(database_url: str) -> dict[str, bool]:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


settings = get_settings()
engine = create_engine(settings.database_url, connect_args=_connect_args(settings.database_url))
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_db_and_tables() -> None:
    _bootstrap_sqlite_columns()
    Base.metadata.create_all(bind=engine)


def _bootstrap_sqlite_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    with engine.begin() as connection:
        table_names = {
            row[0]
            for row in connection.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            ).fetchall()
        }
        if "users" not in table_names:
            return

        existing_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(users)")).fetchall()
        }
        if "email" in existing_columns and "login_id" not in existing_columns:
            raise RuntimeError(
                "Legacy users.email schema detected. Remove the existing SQLite DB and restart to rebuild "
                "with the new users.login_id schema."
            )
        column_statements = {
            "account_type": "ALTER TABLE users ADD COLUMN account_type VARCHAR(8) NOT NULL DEFAULT 'OWNER'",
            "owner_user_id": "ALTER TABLE users ADD COLUMN owner_user_id INTEGER",
            "pin_hash": "ALTER TABLE users ADD COLUMN pin_hash VARCHAR(255)",
            "position_label": "ALTER TABLE users ADD COLUMN position_label VARCHAR(120)",
            "active": "ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT 1",
            "deleted_at": "ALTER TABLE users ADD COLUMN deleted_at DATETIME",
        }

        for column_name, statement in column_statements.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))
