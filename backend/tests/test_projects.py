from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def create_test_project() -> dict:
    response = client.post(
        "/api/projects",
        json={
            "topic": "秋季新品茶饮推广",
            "platform": "小红书",
            "style": "自然治愈",
            "audience": "普通用户",
            "length": "medium",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True

    return data["data"]


def create_test_version(project_id: int, title: str) -> dict:
    response = client.post(
        f"/api/projects/{project_id}/versions",
        json={
            "source_type": "generated",
            "optimization_goal": None,
            "title": title,
            "body": "风吹过窗边，茶香慢慢升起。",
            "hashtags": [
                "秋日饮茶",
                "小红书文案",
                "生活方式",
            ],
            "content": (
                f"{title}\n\n"
                "风吹过窗边，茶香慢慢升起。\n\n"
                "#秋日饮茶 #小红书文案 #生活方式"
            ),
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True

    return data["data"]


def test_create_content_project():
    project = create_test_project()

    assert project["id"] > 0
    assert project["topic"] == "秋季新品茶饮推广"
    assert project["platform"] == "小红书"
    assert project["style"] == "自然治愈"
    assert project["audience"] == "普通用户"
    assert project["length"] == "medium"
    assert project["status"] == "drafting"
    assert project["created_at"]
    assert project["updated_at"]


def test_list_content_projects():
    project = create_test_project()

    response = client.get("/api/projects")

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert data["pagination"]["limit"] == 20
    assert data["pagination"]["offset"] == 0
    assert data["pagination"]["count"] == len(data["data"])

    project_ids = [
        item["id"]
        for item in data["data"]
    ]

    assert project["id"] in project_ids


def test_get_content_project():
    project = create_test_project()

    response = client.get(
        f"/api/projects/{project['id']}"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["data"]["id"] == project["id"]
    assert data["data"]["topic"] == "秋季新品茶饮推广"


def test_get_missing_content_project_returns_404():
    response = client.get("/api/projects/999999")

    assert response.status_code == 404
    assert response.json()["detail"] == "内容项目不存在。"


def test_create_content_version():
    project = create_test_project()

    version = create_test_version(
        project_id=project["id"],
        title="秋天的第一杯茶，从一口回甘开始",
    )

    assert version["id"] > 0
    assert version["project_id"] == project["id"]
    assert version["source_type"] == "generated"
    assert version["optimization_goal"] is None
    assert version["is_final"] is False
    assert version["hashtags"] == [
        "秋日饮茶",
        "小红书文案",
        "生活方式",
    ]


def test_create_version_for_missing_project_returns_404():
    response = client.post(
        "/api/projects/999999/versions",
        json={
            "source_type": "generated",
            "optimization_goal": None,
            "title": "不存在项目的版本",
            "body": "这条内容不应被保存。",
            "hashtags": [],
            "content": "不存在项目的版本\n\n这条内容不应被保存。",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "内容项目不存在。"


def test_list_content_versions():
    project = create_test_project()

    first_version = create_test_version(
        project_id=project["id"],
        title="第一版茶饮文案",
    )
    second_version = create_test_version(
        project_id=project["id"],
        title="第二版茶饮文案",
    )

    response = client.get(
        f"/api/projects/{project['id']}/versions"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert isinstance(data["data"], list)
    assert data["pagination"]["count"] == 2

    version_ids = [
        item["id"]
        for item in data["data"]
    ]

    assert first_version["id"] in version_ids
    assert second_version["id"] in version_ids


def test_list_versions_for_missing_project_returns_404():
    response = client.get(
        "/api/projects/999999/versions"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "内容项目不存在。"


def test_set_content_version_as_final():
    project = create_test_project()

    first_version = create_test_version(
        project_id=project["id"],
        title="初稿",
    )
    second_version = create_test_version(
        project_id=project["id"],
        title="优化稿",
    )

    response = client.patch(
        f"/api/versions/{second_version['id']}/final"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["success"] is True
    assert data["message"] == "已设置为最终稿。"
    assert data["data"]["id"] == second_version["id"]
    assert data["data"]["is_final"] is True

    versions_response = client.get(
        f"/api/projects/{project['id']}/versions"
    )

    assert versions_response.status_code == 200

    versions = versions_response.json()["data"]

    final_versions = [
        version
        for version in versions
        if version["is_final"] is True
    ]

    assert len(final_versions) == 1
    assert final_versions[0]["id"] == second_version["id"]

    first_version_in_list = next(
        version
        for version in versions
        if version["id"] == first_version["id"]
    )

    assert first_version_in_list["is_final"] is False

    project_response = client.get(
        f"/api/projects/{project['id']}"
    )

    assert project_response.status_code == 200
    assert project_response.json()["data"]["status"] == "final"


def test_set_missing_content_version_as_final_returns_404():
    response = client.patch("/api/versions/999999/final")

    assert response.status_code == 404
    assert response.json()["detail"] == "内容版本不存在。"


def test_versions_reject_invalid_limit():
    project = create_test_project()

    response = client.get(
        f"/api/projects/{project['id']}/versions?limit=0"
    )

    assert response.status_code == 422