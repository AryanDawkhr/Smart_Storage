"""Copy the existing SQLite database into a MySQL database.

Usage from the repository root:
    python backend/migrate_sqlite_to_mysql.py \
        --mysql-url mysql+pymysql://user:password@localhost:3306/smart_storage
"""

import argparse
import os
import sys

from sqlalchemy import create_engine, inspect, select, text
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(__file__))

from app.database.session import Base  # noqa: E402
from app.models import models  # noqa: F401,E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        default="sqlite:///./smart_storage.db",
        help="SQLAlchemy URL for the source database",
    )
    parser.add_argument(
        "--mysql-url",
        required=True,
        help="SQLAlchemy MySQL URL, for example mysql+pymysql://user:password@localhost:3306/smart_storage",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete existing rows in the target tables before copying",
    )
    return parser.parse_args()


def table_order() -> list[str]:
    """Return model tables in dependency order for foreign-key-safe inserts."""
    return [
        "users",
        "storage_units",
        "devices",
        "crops",
        "crop_profiles",
        "storage_records",
        "sensor_readings",
        "alerts",
        "market_data",
        "transport_data",
        "recommendations",
        "sync_queue",
        "audit_logs",
    ]


def migrate(source_url: str, target_url: str, replace: bool) -> None:
    source_engine = create_engine(source_url)
    target_engine = create_engine(target_url)

    if target_engine.dialect.name != "mysql":
        raise ValueError("--mysql-url must use a MySQL SQLAlchemy URL")

    source_inspector = inspect(source_engine)
    missing = [table for table in table_order() if table not in source_inspector.get_table_names()]
    if missing:
        raise RuntimeError(f"Source database is missing tables: {', '.join(missing)}")

    Base.metadata.create_all(bind=target_engine)
    tables = {table.name: table for table in Base.metadata.sorted_tables}

    with Session(source_engine) as source, Session(target_engine) as target:
        if replace:
            # Disable checks only for clearing the target; inserts still follow FK order.
            target.execute(text("SET FOREIGN_KEY_CHECKS=0"))
            for table_name in reversed(table_order()):
                target.execute(tables[table_name].delete())
            target.execute(text("SET FOREIGN_KEY_CHECKS=1"))
            target.commit()

        for table_name in table_order():
            table = tables[table_name]
            rows = source.execute(select(table)).mappings().all()
            if not rows:
                print(f"{table_name}: 0 rows")
                continue

            if replace:
                target.execute(table.insert(), [dict(row) for row in rows])
            else:
                existing_ids = {
                    row[0]
                    for row in target.execute(select(table.c.id)).all()
                }
                new_rows = [dict(row) for row in rows if row["id"] not in existing_ids]
                if new_rows:
                    target.execute(table.insert(), new_rows)
            target.commit()
            print(f"{table_name}: {len(rows)} source rows copied")

    print("Migration completed successfully.")


if __name__ == "__main__":
    arguments = parse_args()
    migrate(arguments.source, arguments.mysql_url, arguments.replace)