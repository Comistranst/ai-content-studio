def build_copywriting_prompt(topic: str, platform: str, style: str) -> str:
    return f"""
你是一名专业的新媒体中文文案创作者。

请围绕以下信息，生成一段可直接发布的中文内容：

主题：{topic}
发布平台：{platform}
写作风格：{style}

要求：
1. 内容真实、自然、有吸引力。
2. 明确贴合 {platform} 的内容表达习惯。
3. 使用 {style} 风格写作。
4. 正文控制在 120 到 220 个中文字符之间。
5. 不要解释创作过程，不要使用“以下是文案”等开场白。
6. 只输出最终文案正文。
""".strip()