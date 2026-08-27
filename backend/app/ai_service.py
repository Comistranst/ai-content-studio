import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from app.prompts import (
    build_copywriting_prompt,
    build_optimize_prompt,
)


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


MAX_TOKENS_BY_LENGTH = {
    "short": 120,
    "medium": 300,
    "long": 650,
}


def parse_generated_content(content: str) -> dict:
    content = content.strip()

    title = ""
    body = content
    hashtags = []

    lines = [line.strip() for line in content.splitlines()]
    title_index = None
    body_index = None
    tags_index = None

    for index, line in enumerate(lines):
        if line.startswith("标题：") or line.startswith("标题:"):
            title_index = index
        elif line.startswith("正文：") or line.startswith("正文:"):
            body_index = index
        elif line.startswith("标签：") or line.startswith("标签:"):
            tags_index = index

    if title_index is not None:
        title = lines[title_index].split("：", 1)[-1].split(":", 1)[-1].strip()

    if body_index is not None:
        body_end = tags_index if tags_index is not None else len(lines)

        body_lines = [
            line
            for line in lines[body_index + 1 : body_end]
            if line and not line.startswith("#")
        ]
        body = "\n".join(body_lines).strip()

    hashtags = [
        tag
        for line in lines
        if line.startswith("#")
        for tag in line.split()
        if tag.startswith("#")
    ]

    if tags_index is not None:
        tag_text = "\n".join(lines[tags_index:])
        hashtags = [
            tag
            for tag in tag_text.replace("标签：", "").replace("标签:", "").split()
            if tag.startswith("#")
        ]

    return {
        "title": title,
        "body": body,
        "hashtags": hashtags,
        "content": content,
    }


def generate_ai_content(
    topic: str,
    platform: str,
    style: str,
    audience: str,
    length: str,
) -> dict:
    api_key = os.getenv("DEEPSEEK_API_KEY")

    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured.")

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com",
    )

    prompt = build_copywriting_prompt(
        topic=topic,
        platform=platform,
        style=style,
        audience=audience,
        length=length,
    )

    max_tokens = MAX_TOKENS_BY_LENGTH.get(
        length,
        MAX_TOKENS_BY_LENGTH["medium"],
    )

    print(
        f"Generating copy: length={length}, "
        f"max_tokens={max_tokens}, audience={audience}"
    )

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {
                "role": "system",
                "content": "你是可靠、专业的中文新媒体文案助手。",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.8,
        max_tokens=max_tokens,
    )

    content = response.choices[0].message.content

    if not content:
        raise RuntimeError("AI returned empty content.")

    return parse_generated_content(content)

def optimize_ai_content(content: str, goal: str) -> dict:
    api_key = os.getenv("DEEPSEEK_API_KEY")

    if not api_key:
        raise RuntimeError("DEEPSEEK_API_KEY is not configured.")

    client = OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com",
    )

    prompt = build_optimize_prompt(
        content=content,
        goal=goal,
    )

    print(f"Optimizing copy: goal={goal}")

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {
                "role": "system",
                "content": "你是可靠、专业的中文新媒体文案编辑。",
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        temperature=0.6,
        max_tokens=800,
    )

    optimized_content = response.choices[0].message.content

    if not optimized_content:
        raise RuntimeError("AI returned empty optimized content.")

    return {
        "original_content": content,
        "optimized_content": optimized_content.strip(),
        "goal": goal,
    }