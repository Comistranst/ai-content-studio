from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


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


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "AI Content Studio backend is running",
    }


@app.post("/api/generate")
def generate_content(request: GenerateRequest):
    content = (
        f"最近在认真研究「{request.topic}」，"
        f"发现它真的能提升日常体验。\n\n"
        f"如果你也在关注{request.topic}，"
        f"不妨从自己的实际需求出发，挑选更适合自己的选择。\n\n"
        f"适合分享在{request.platform}，整体采用{request.style}风格。"
    )

    return {
        "success": True,
        "data": {
            "topic": request.topic,
            "platform": request.platform,
            "style": request.style,
            "content": content,
        },
    }