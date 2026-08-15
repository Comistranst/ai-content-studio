import os

from openai import OpenAI

from app.prompts import build_copywriting_prompt


def generate_ai_content(topic: str, platform: str, style: str) -> str:
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
    )

    content = response.choices[0].message.content

    if not content:
        raise RuntimeError("AI returned empty content.")

    return content.strip()