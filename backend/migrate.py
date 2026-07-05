import sqlite3

conn = sqlite3.connect("pokemon.db")
cur = conn.cursor()

# 1. Create the new binders table
cur.execute("""
CREATE TABLE IF NOT EXISTS binders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    name TEXT,
    size INTEGER DEFAULT 3
)
""")

# 2. Add new columns to binder_pages if they don't already exist
cur.execute("PRAGMA table_info(binder_pages)")
existing_cols = [row[1] for row in cur.fetchall()]

if "binder_id" not in existing_cols:
    cur.execute("ALTER TABLE binder_pages ADD COLUMN binder_id INTEGER")

if "page_number" not in existing_cols:
    cur.execute("ALTER TABLE binder_pages ADD COLUMN page_number INTEGER DEFAULT 1")

conn.commit()

# 3. Wrap every existing page (that doesn't have a binder yet) in its own Binder
cur.execute("SELECT id, user_id, name, rows, cols FROM binder_pages WHERE binder_id IS NULL")
orphan_pages = cur.fetchall()

for page_id, user_id, name, rows, cols in orphan_pages:
    cur.execute(
        "INSERT INTO binders (user_id, name, size) VALUES (?, ?, ?)",
        (user_id, name, rows)
    )
    binder_id = cur.lastrowid
    cur.execute(
        "UPDATE binder_pages SET binder_id = ?, page_number = 1 WHERE id = ?",
        (binder_id, page_id)
    )

conn.commit()
conn.close()

print(f"Migration complete. Wrapped {len(orphan_pages)} existing page(s) into new binders.")
