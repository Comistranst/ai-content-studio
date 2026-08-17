import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from app.prompts import build_copywriting_prompt


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


MAX_TOKENS_BY_LENGTH = {
    "short": 120,
    "medium": 300,
    "long": 650,
}


def generate_ai_content(
    topic: str,
    platform: str,
    style: str,
    audience: str,
    length: str,
) -> str:
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

    return content.strip()