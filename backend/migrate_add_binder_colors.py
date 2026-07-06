"""
One-time migration: adds page_color / border_color columns to the existing
`binders` table in Postgres. Safe to re-run (uses IF NOT EXISTS).

Usage:
    python migrate_add_binder_colors.py
"""

from sqlalchemy import text
from database import engine

DEFAULT_PAGE_COLOR = "#f3ecdf"
DEFAULT_BORDER_COLOR = "#3c2a20"

with engine.begin() as conn:
    conn.execute(text(
        f"ALTER TABLE binders ADD COLUMN IF NOT EXISTS page_color VARCHAR DEFAULT '{DEFAULT_PAGE_COLOR}'"
    ))
    conn.execute(text(
        f"ALTER TABLE binders ADD COLUMN IF NOT EXISTS border_color VARCHAR DEFAULT '{DEFAULT_BORDER_COLOR}'"
    ))
    conn.execute(text(
        f"UPDATE binders SET page_color = '{DEFAULT_PAGE_COLOR}' WHERE page_color IS NULL"
    ))
    conn.execute(text(
        f"UPDATE binders SET border_color = '{DEFAULT_BORDER_COLOR}' WHERE border_color IS NULL"
    ))

print("Migration complete. binders.page_color and binders.border_color are ready.")