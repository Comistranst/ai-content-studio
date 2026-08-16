from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.ai_service import generate_ai_content
from app.database import (
    get_generation_history,
    init_database,
    save_generation,
    delete_generation,
)

app = FastAPI(
    title="AI Content Studio API",
    version="0.1.0",
    description="AI Content Studio 后端服务",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
    ], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=100)
    platform: str = Field(min_length=1, max_length=50)
    style: str = Field(min_length=1, max_length=50)


@app.on_event("startup")
def startup():
    init_database()


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "AI Content Studio backend is running",
    }


@app.post("/api/generate")
def generate_content(request: GenerateRequest):
    try:
        content = generate_ai_content(
            topic=request.topic,
            platform=request.platform,
            style=request.style,
        )
    except Exception as error:
        print(f"AI generation error: {error}")

        raise HTTPException(
            status_code=502,
            detail="AI 文案生成失败，请稍后重试。",
        )

    generation_id = save_generation(
        topic=request.topic,
        platform=request.platform,
        style=request.style,
        content=content,
    )

    return {
        "success": True,
        "data": {
            "id": generation_id,
            "topic": request.topic,
            "platform": request.platform,
            "style": request.style,
            "content": content,
        },
    }
@app.get("/api/history")
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

@app.delete("/api/history/{generation_id}")
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