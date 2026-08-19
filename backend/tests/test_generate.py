from fastapi.testclient import TestClient

import app.main as main


client = TestClient(main.app)


def test_generate_content_success(monkeypatch):
    def fake_generate_ai_content(topic, platform, style, audience, length):
        return {
            "title": "通勤包实测：上班族的轻松选择",
            "body": "容量、收纳和通勤体验都很适合日常使用。",
            "hashtags": ["#通勤包", "#职场好物"],
            "content": (
                "通勤包实测：上班族的轻松选择\n\n"
                "容量、收纳和通勤体验都很适合日常使用。\n\n"
                "#通勤包 #职场好物"
            ),
        }

    monkeypatch.setattr(
        main,
        "generate_ai_content",
        fake_generate_ai_content,
    )

    response = client.post(
        "/api/generate",
        json={
            "topic": "通勤手提包",
            "platform": "小红书",
            "style": "真实种草",
            "audience": "20—30 岁职场女性",
            "length": "medium",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["data"]["topic"] == "通勤手提包"
    assert data["data"]["platform"] == "小红书"
    assert data["data"]["style"] == "真实种草"
    assert data["data"]["audience"] == "20—30 岁职场女性"
    assert data["data"]["length"] == "medium"
    assert data["data"]["title"] == "通勤包实测：上班族的轻松选择"
    assert data["data"]["hashtags"] == ["#通勤包", "#职场好物"]

def test_generate_rejects_empty_topic():
    response = client.post(
        "/api/generate",
        json={
            "topic": "",
            "platform": "小红书",
            "style": "真实种草",
            "audience": "普通用户",
            "length": "medium",
        },
    )

    assert response.status_code == 422