import pytest
from unittest.mock import patch, AsyncMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from server.api.config import router

# Create FastAPI app and include your router
app = FastAPI()
app.include_router(router)


@pytest.fixture(scope="module")
def test_app():
    client = TestClient(app)
    yield client


# Helper function to validate JSON response
def is_valid_json(response):
    try:
        response.json()
        return True
    except ValueError:
        return False


# Test functions
def test_get_prompts(test_app):
    response = test_app.get("/prompts")
    assert response.status_code == 200
    assert is_valid_json(response)


def test_get_config(test_app):
    response = test_app.get("/config")
    assert response.status_code == 200
    assert is_valid_json(response)


def test_get_custom_headings(test_app):
    response = test_app.get("/custom-headings")
    assert response.status_code == 200
    assert is_valid_json(response)


def test_get_all_options(test_app):
    response = test_app.get("/options")
    assert response.status_code == 200
    assert is_valid_json(response)


def test_update_prompts(test_app):
    new_prompts = {
        "NEW_PROMPT": {
            "system": "New System Prompt",
            "initial": "New Initial Prompt",
        }
    }
    response = test_app.post("/prompts", json=new_prompts)
    assert response.status_code == 200
    assert is_valid_json(response)


def test_update_config(test_app):
    new_config = {"NEW_CONFIG": "new_value"}
    response = test_app.post("/config", json=new_config)
    assert response.status_code == 200
    assert is_valid_json(response)


def test_update_custom_headings(test_app):
    new_headings = {"NEW_HEADING": "New Custom Heading"}
    response = test_app.post("/custom-headings", json=new_headings)
    assert response.status_code == 200
    assert is_valid_json(response)


def test_update_options(test_app):
    new_options = {"NEW_OPTION": "new_option_value"}
    response = test_app.post("/options/TEST_CATEGORY", json=new_options)
    assert response.status_code == 200
    assert is_valid_json(response)


def test_reset_to_defaults(test_app):
    response = test_app.post("/reset-to-defaults")
    assert response.status_code == 200
    assert is_valid_json(response)
