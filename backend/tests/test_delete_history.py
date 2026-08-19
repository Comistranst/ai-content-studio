from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_delete_missing_history_returns_404():
    response = client.delete("/api/history/999999999")

    assert response.status_code == 404

    data = response.json()

    assert data["detail"] == "历史记录不存在或已经删除。"