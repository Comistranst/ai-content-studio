from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_get_history():
    response = client.get("/api/history")

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert isinstance(data["data"], list)

    assert data["pagination"]["limit"] == 10
    assert data["pagination"]["offset"] == 0
    assert data["pagination"]["count"] == len(data["data"])


def test_history_rejects_invalid_limit():
    response = client.get("/api/history?limit=0")

    assert response.status_code == 422