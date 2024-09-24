import pytest
import os
import sqlite3
from server.database.connection import PatientDatabase

@pytest.fixture(scope="module")
def test_db():
    # Set up the test environment
    os.environ['TEST_MODE'] = 'True'
    db = PatientDatabase(db_dir="/tmp")
    yield db
    # Clean up after tests
    db.clear_test_database()
    db.close()
    os.remove(db.db_path)
    os.environ.pop('TEST_MODE', None)

def test_database_initialization(test_db):
    assert test_db.is_test == True
    assert "test_scribe_database.sqlite" in test_db.db_path
    assert os.path.exists(test_db.db_path)

def test_create_tables(test_db):
    tables = [
        "patients", "rss_feeds", "todos", "rss_items",
        "config", "prompts", "options", "custom_headings"
    ]
    for table in tables:
        test_db.cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
        assert test_db.cursor.fetchone() is not None

def test_insert_and_retrieve_patient(test_db):
    test_db.cursor.execute(
        """
        INSERT INTO patients (name, dob, ur_number, gender, encounter_date)
        VALUES (?, ?, ?, ?, ?)
        """,
        ("John Doe", "1990-01-01", "UR12345", "M", "2023-06-15")
    )
    test_db.db.commit()

    test_db.cursor.execute("SELECT * FROM patients WHERE name = ?", ("John Doe",))
    patient = test_db.cursor.fetchone()
    assert patient is not None
    assert patient['name'] == "John Doe"
    assert patient['ur_number'] == "UR12345"

def test_insert_and_retrieve_rss_feed(test_db):
    test_db.cursor.execute(
        """
        INSERT INTO rss_feeds (url, title, last_refreshed)
        VALUES (?, ?, ?)
        """,
        ("http://example.com/feed", "Test Feed", "2023-06-15 12:00:00")
    )
    test_db.db.commit()

    test_db.cursor.execute("SELECT * FROM rss_feeds WHERE url = ?", ("http://example.com/feed",))
    feed = test_db.cursor.fetchone()
    assert feed is not None
    assert feed['title'] == "Test Feed"

def test_clear_test_database(test_db):
    # Insert some data
    test_db.cursor.execute("INSERT INTO patients (name) VALUES (?)", ("Test Patient",))
    test_db.cursor.execute("INSERT INTO rss_feeds (url) VALUES (?)", ("http://test.com",))
    test_db.db.commit()

    # Clear the database
    test_db.clear_test_database()

    # Check if the tables are empty
    tables = [
        "patients", "rss_feeds", "todos", "rss_items",
        "config", "prompts", "options", "custom_headings"
    ]
    for table in tables:
        test_db.cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = test_db.cursor.fetchone()[0]
        assert count == 0

def test_database_connection(test_db):
    assert isinstance(test_db.db, sqlite3.Connection)
    assert test_db.db.isolation_level is not None

def test_commit_and_rollback(test_db):
    # Test commit
    test_db.cursor.execute("INSERT INTO patients (name) VALUES (?)", ("Commit Test",))
    test_db.commit()
    test_db.cursor.execute("SELECT * FROM patients WHERE name = ?", ("Commit Test",))
    assert test_db.cursor.fetchone() is not None

    # Test rollback
    test_db.cursor.execute("INSERT INTO patients (name) VALUES (?)", ("Rollback Test",))
    test_db.db.rollback()
    test_db.cursor.execute("SELECT * FROM patients WHERE name = ?", ("Rollback Test",))
    assert test_db.cursor.fetchone() is None