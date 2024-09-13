from server.database.connection import PatientDatabase

db = PatientDatabase()


def add_rss_feed(url: str, title: str):
    db.cursor.execute(
        "INSERT INTO rss_feeds (url, title) VALUES (?, ?)", (url, title)
    )
    db.commit()


def get_rss_feeds():
    db.cursor.execute("SELECT * FROM rss_feeds")
    return [dict(row) for row in db.cursor.fetchall()]


def add_todo(task: str):
    db.cursor.execute("INSERT INTO todos (task) VALUES (?)", (task,))
    db.commit()


def get_todos():
    db.cursor.execute("SELECT * FROM todos")
    return [dict(row) for row in db.cursor.fetchall()]


def add_rss_item(
    feed_id: int,
    title: str,
    link: str,
    description: str,
    published: str,
    digest: str,
):
    db.cursor.execute(
        "INSERT INTO rss_items (feed_id, title, link, description, published, digest) VALUES (?, ?, ?, ?, ?, ?)",
        (feed_id, title, link, description, published, digest),
    )
    db.commit()


def get_rss_items(feed_id: int = None):
    if feed_id:
        db.cursor.execute(
            "SELECT * FROM rss_items WHERE feed_id = ?", (feed_id,)
        )
    else:
        db.cursor.execute("SELECT * FROM rss_items")
    return [dict(row) for row in db.cursor.fetchall()]
