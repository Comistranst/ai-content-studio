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
        f"发现一只让{request.topic}更有仪式感的好物！"
        f"为你打造适合{request.platform}的{request.style}文案："
        f"简约好看又实用，值得认真体验。"
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