from typing import Literal
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.ai_service import (
    generate_ai_content,
    optimize_ai_content,
)
from app.database import (
    create_content_version,
    create_project,
    delete_generation,
    get_content_versions,
    get_generation_history,
    get_project_by_id,
    get_projects,
    init_database,
    save_generation,
    set_final_content_version,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    yield

app = FastAPI(
    title="AI Content Studio API",
    version="0.1.0",
    description="AI Content Studio 后端服务",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
        "https://ai-content-studio-ecru.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=100)
    platform: str = Field(min_length=1, max_length=50)
    style: str = Field(min_length=1, max_length=50)
    audience: str = Field(
        default="普通用户",
        min_length=1,
        max_length=100,
    )
    length: Literal["short", "medium", "long"] = "medium"

class OptimizeRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)
    goal: Literal[
        "更简洁",
        "更有吸引力",
        "更专业",
        "更适合小红书",
    ]

class ProjectCreateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=100)
    platform: str = Field(min_length=1, max_length=50)
    style: str = Field(min_length=1, max_length=50)
    audience: str = Field(
        default="普通用户",
        min_length=1,
        max_length=100,
    )
    length: Literal["short", "medium", "long"] = "medium"


class ProjectDataResponse(BaseModel):
    id: int
    topic: str
    platform: str
    style: str
    audience: str
    length: str
    status: Literal["drafting", "final"]
    created_at: str
    updated_at: str


class ProjectCreateResponse(BaseModel):
    success: bool
    data: ProjectDataResponse

class ContentVersionCreateRequest(BaseModel):
    source_type: Literal["generated", "optimized", "manual"]
    optimization_goal: str | None = Field(
        default=None,
        max_length=100,
    )
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=10000)
    hashtags: list[str] = Field(default_factory=list)
    content: str = Field(min_length=1, max_length=12000)


class ContentVersionDataResponse(BaseModel):
    id: int
    project_id: int
    source_type: Literal["generated", "optimized", "manual"]
    optimization_goal: str | None
    title: str
    body: str
    hashtags: list[str]
    content: str
    is_final: bool
    created_at: str


class ContentVersionCreateResponse(BaseModel):
    success: bool
    data: ContentVersionDataResponse
class FinalVersionResponse(BaseModel):
    success: bool
    message: str
    data: ContentVersionDataResponse
class ContentVersionPaginationResponse(BaseModel):
    limit: int
    offset: int
    count: int


class ContentVersionListResponse(BaseModel):
    success: bool
    data: list[ContentVersionDataResponse]
    pagination: ContentVersionPaginationResponse
class ProjectPaginationResponse(BaseModel):
    limit: int
    offset: int
    count: int


class ProjectListResponse(BaseModel):
    success: bool
    data: list[ProjectDataResponse]
    pagination: ProjectPaginationResponse
class OptimizeDataResponse(BaseModel):
    original_content: str
    optimized_content: str
    goal: str


class OptimizeResponse(BaseModel):
    success: bool
    data: OptimizeDataResponse

class HealthResponse(BaseModel):
    status: str
    message: str

class GenerateDataResponse(BaseModel):
    id: int
    topic: str
    platform: str
    style: str
    audience: str
    length: str
    title: str
    body: str
    hashtags: str | list[str]
    content: str


class GenerateResponse(BaseModel):
    success: bool
    data: GenerateDataResponse

class HistoryItemResponse(BaseModel):
    id: int
    topic: str
    platform: str
    style: str
    audience: str
    content_length: str
    title: str
    body: str
    hashtags: list[str]
    content: str
    created_at: str


class PaginationResponse(BaseModel):
    limit: int
    offset: int
    count: int


class HistoryResponse(BaseModel):
    success: bool
    data: list[HistoryItemResponse]
    pagination: PaginationResponse

class DeleteHistoryDataResponse(BaseModel):
    id: int


class DeleteHistoryResponse(BaseModel):
    success: bool
    message: str
    data: DeleteHistoryDataResponse



@app.get("/api/health", response_model=HealthResponse)
def health_check():
    return {
        "status": "ok",
        "message": "AI Content Studio backend is running",
    }

@app.post("/api/projects", response_model=ProjectCreateResponse)
def create_content_project(request: ProjectCreateRequest):
    try:
        project = create_project(
            topic=request.topic,
            platform=request.platform,
            style=request.style,
            audience=request.audience,
            content_length=request.length,
        )
    except Exception as error:
        print(f"Project create error: {error}")

        raise HTTPException(
            status_code=500,
            detail="创建内容项目失败，请稍后重试。",
        )

    return {
        "success": True,
        "data": {
            "id": project["id"],
            "topic": project["topic"],
            "platform": project["platform"],
            "style": project["style"],
            "audience": project["audience"],
            "length": project["content_length"],
            "status": project["status"],
            "created_at": project["created_at"],
            "updated_at": project["updated_at"],
        },
    }

@app.get("/api/projects", response_model=ProjectListResponse)
def list_content_projects(
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
):
    try:
        projects = get_projects(
            limit=limit,
            offset=offset,
        )
    except Exception as error:
        print(f"Project list error: {error}")

        raise HTTPException(
            status_code=500,
            detail="获取内容项目列表失败，请稍后重试。",
        )

    return {
        "success": True,
        "data": [
            {
                "id": project["id"],
                "topic": project["topic"],
                "platform": project["platform"],
                "style": project["style"],
                "audience": project["audience"],
                "length": project["content_length"],
                "status": project["status"],
                "created_at": project["created_at"],
                "updated_at": project["updated_at"],
            }
            for project in projects
        ],
        "pagination": {
            "limit": limit,
            "offset": offset,
            "count": len(projects),
        },
    }


@app.get(
    "/api/projects/{project_id}",
    response_model=ProjectCreateResponse,
)
def get_content_project(project_id: int):
    try:
        project = get_project_by_id(project_id)
    except Exception as error:
        print(f"Project detail error: {error}")

        raise HTTPException(
            status_code=500,
            detail="获取内容项目详情失败，请稍后重试。",
        )

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="内容项目不存在。",
        )

    return {
        "success": True,
        "data": {
            "id": project["id"],
            "topic": project["topic"],
            "platform": project["platform"],
            "style": project["style"],
            "audience": project["audience"],
            "length": project["content_length"],
            "status": project["status"],
            "created_at": project["created_at"],
            "updated_at": project["updated_at"],
        },
    }

@app.post(
    "/api/projects/{project_id}/versions",
    response_model=ContentVersionCreateResponse,
)
def create_project_content_version(
    project_id: int,
    request: ContentVersionCreateRequest,
):
    project = get_project_by_id(project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="内容项目不存在。",
        )

    try:
        version = create_content_version(
            project_id=project_id,
            source_type=request.source_type,
            optimization_goal=request.optimization_goal,
            title=request.title,
            body=request.body,
            hashtags=request.hashtags,
            content=request.content,
        )
    except Exception as error:
        print(f"Content version create error: {error}")

        raise HTTPException(
            status_code=500,
            detail="创建内容版本失败，请稍后重试。",
        )

    return {
        "success": True,
        "data": version,
    }

@app.get(
    "/api/projects/{project_id}/versions",
    response_model=ContentVersionListResponse,
)
def list_project_content_versions(
    project_id: int,
    limit: int = Query(default=20, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
):
    project = get_project_by_id(project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="内容项目不存在。",
        )

    try:
        versions = get_content_versions(
            project_id=project_id,
            limit=limit,
            offset=offset,
        )
    except Exception as error:
        print(f"Content version list error: {error}")

        raise HTTPException(
            status_code=500,
            detail="获取内容版本列表失败，请稍后重试。",
        )

    return {
        "success": True,
        "data": versions,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "count": len(versions),
        },
    }

@app.patch(
    "/api/versions/{version_id}/final",
    response_model=FinalVersionResponse,
)
def set_content_version_as_final(version_id: int):
    try:
        version = set_final_content_version(version_id)
    except Exception as error:
        print(f"Set final version error: {error}")

        raise HTTPException(
            status_code=500,
            detail="设置最终稿失败，请稍后重试。",
        )

    if version is None:
        raise HTTPException(
            status_code=404,
            detail="内容版本不存在。",
        )

    return {
        "success": True,
        "message": "已设置为最终稿。",
        "data": version,
    }
@app.post("/api/generate", response_model=GenerateResponse)
def generate_content(request: GenerateRequest):
    try:
        generated = generate_ai_content(
            topic=request.topic,
            platform=request.platform,
            style=request.style,
            audience=request.audience,
            length=request.length,
        )

        content = generated["content"]

    except Exception as error:
        print(f"AI generation error: {error}")

        raise HTTPException(
            status_code=502,
            detail="AI 文案生成失败，请稍后重试。",
        )

    try:
        generation_id = save_generation(
            topic=request.topic,
            platform=request.platform,
            style=request.style,
            audience=request.audience,
            content_length=request.length,
            title=generated["title"],
            body=generated["body"],
            hashtags=generated["hashtags"],
            content=content,
        )
    except Exception as error:
        print(f"Database save error: {error}")

        raise HTTPException(
            status_code=500,
            detail="生成内容已完成，但保存历史记录失败，请稍后重试。",
        )

    return {
        "success": True,
        "data": {
            "id": generation_id,
            "topic": request.topic,
            "platform": request.platform,
            "style": request.style,
            "audience": request.audience,
            "length": request.length,
            "title": generated["title"],
            "body": generated["body"],
            "hashtags": generated["hashtags"],
            "content": content,
        },
    }

@app.post("/api/optimize", response_model=OptimizeResponse)
def optimize_content(request: OptimizeRequest):
    try:
        result = optimize_ai_content(
            content=request.content,
            goal=request.goal,
        )
    except Exception as error:
        print(f"AI optimization error: {error}")

        raise HTTPException(
            status_code=502,
            detail="AI 文案优化失败，请稍后重试。",
        )

    return {
        "success": True,
        "data": result,
    }

@app.get("/api/history", response_model=HistoryResponse)
def get_history(
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
):
    records = get_generation_history(
        limit=limit,
        offset=offset,
    )

    return {
        "success": True,
        "data": records,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "count": len(records),
        },
    }


@app.delete(
    "/api/history/{generation_id}",
    response_model=DeleteHistoryResponse,
)
def delete_history(generation_id: int):
    deleted = delete_generation(generation_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="历史记录不存在或已经删除。",
        )

    return {
        "success": True,
        "message": "历史记录已删除。",
        "data": {
            "id": generation_id,
        },
    }