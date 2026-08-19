from fastapi.testclient import TestClient

from app.database import get_generation_history, save_generation
from app.main import app


client = TestClient(app)


def test_delete_missing_history_returns_404():
    response = client.delete("/api/history/999999999")

    assert response.status_code == 404

    data = response.json()

    assert data["detail"] == "历史记录不存在或已经删除。"


def test_delete_existing_history_returns_success():
    generation_id = save_generation(
        topic="测试删除记录",
        platform="测试平台",
        style="测试风格",
        audience="测试用户",
        content_length="short",
        title="测试标题",
        body="这是一条会被删除的测试正文。",
        hashtags=["#测试"],
        content="测试标题\n\n这是一条会被删除的测试正文。\n\n#测试",
    )

    response = client.delete(f"/api/history/{generation_id}")

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["message"] == "历史记录已删除。"
    assert data["data"]["id"] == generation_id

    records = get_generation_history(limit=50)

    assert all(record["id"] != generation_id for record in records)