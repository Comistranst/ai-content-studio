from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_optimize_rejects_empty_content():
    response = client.post(
        "/api/optimize",
        json={
            "content": "",
            "goal": "更简洁",
        },
    )

    assert response.status_code == 422


def test_optimize_rejects_invalid_goal():
    response = client.post(
        "/api/optimize",
        json={
            "content": "这是一段需要优化的文案。",
            "goal": "不存在的目标",
        },
    )

    assert response.status_code == 422