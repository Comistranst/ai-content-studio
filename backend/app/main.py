from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.ai_service import generate_ai_content
from app.database import (
    get_generation_history,
    init_database,
    save_generation,
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
    content = generate_ai_content(
        topic=request.topic,
        platform=request.platform,
        style=request.style,
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
def get_history():
    records = get_generation_history()

    return {
        "success": True,
        "data": records,
    }