from typing import Literal
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.ai_service import generate_ai_content
from app.database import (
    delete_generation,
    get_generation_history,
    init_database,
    save_generation,
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