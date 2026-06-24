from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
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
    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_dev_schema(engine)


def _ensure_sqlite_dev_schema(bind: Engine) -> None:
    """Keep local SQLite demo DBs usable after model changes.

    This project intentionally avoids Alembic for the mock service prototype, but
    local testers may already have an older mock_delivery.db. SQLite create_all()
    does not add newly introduced columns to existing tables, so we patch only
    additive columns needed by the console/catalog flow.
    """
    if bind.dialect.name != "sqlite":
        return

    schema_updates = {
        "stores": {
            "platform": "VARCHAR(64) NOT NULL DEFAULT 'MOCK_DELIVERY'",
            "available": "BOOLEAN NOT NULL DEFAULT 1",
            "created_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
            "updated_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
        },
        "menus": {
            "type": "VARCHAR(5) NOT NULL DEFAULT 'MAIN'",
            "base_price": "INTEGER NOT NULL DEFAULT 0",
            "allergens_json": "JSON",
            "quantity_min": "INTEGER NOT NULL DEFAULT 1",
            "quantity_max": "INTEGER NOT NULL DEFAULT 10",
            "quantity_default": "INTEGER NOT NULL DEFAULT 1",
            "available": "BOOLEAN NOT NULL DEFAULT 1",
            "sort_order": "INTEGER NOT NULL DEFAULT 0",
            "created_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
            "updated_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
        },
        "option_groups": {
            "selection_type": "VARCHAR(8) NOT NULL DEFAULT 'RADIO'",
            "required": "BOOLEAN NOT NULL DEFAULT 0",
            "min_select": "INTEGER NOT NULL DEFAULT 0",
            "max_select": "INTEGER NOT NULL DEFAULT 1",
            "available": "BOOLEAN NOT NULL DEFAULT 1",
            "sort_order": "INTEGER NOT NULL DEFAULT 0",
            "created_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
            "updated_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
        },
        "options": {
            "additional_price": "INTEGER NOT NULL DEFAULT 0",
            "effect": "VARCHAR(7) NOT NULL DEFAULT 'NONE'",
            "linked_menu_id": "VARCHAR(80)",
            "default_selected": "BOOLEAN NOT NULL DEFAULT 0",
            "available": "BOOLEAN NOT NULL DEFAULT 1",
            "sort_order": "INTEGER NOT NULL DEFAULT 0",
            "created_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
            "updated_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
        },
        "api_configs": {
            "config_id": "VARCHAR(80) NOT NULL DEFAULT ''",
            "name": "VARCHAR(120) NOT NULL DEFAULT ''",
            "provider": "VARCHAR(64) NOT NULL DEFAULT ''",
            "endpoint": "VARCHAR(500) NOT NULL DEFAULT ''",
            "model": "VARCHAR(120) NOT NULL DEFAULT ''",
            "api_key": "TEXT NOT NULL DEFAULT ''",
            "temperature": "FLOAT NOT NULL DEFAULT 0.7",
            "active": "BOOLEAN NOT NULL DEFAULT 0",
            "created_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
            "updated_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
        },
        "console_order_records": {
            "record_id": "VARCHAR(80) NOT NULL DEFAULT ''",
            "status": "VARCHAR(20) NOT NULL DEFAULT 'error'",
            "http_status": "INTEGER NOT NULL DEFAULT 500",
            "store_name": "VARCHAR(120) NOT NULL DEFAULT ''",
            "payload": "TEXT NOT NULL DEFAULT ''",
            "message": "TEXT NOT NULL DEFAULT ''",
            "created_at": "DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00'",
        },
    }

    with bind.begin() as connection:
        for table_name, columns in schema_updates.items():
            existing_columns = {
                row[1] for row in connection.exec_driver_sql(f"PRAGMA table_info({table_name})")
            }
            if not existing_columns:
                continue
            for column_name, column_sql in columns.items():
                if column_name not in existing_columns:
                    connection.exec_driver_sql(
                        f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}"
                    )
