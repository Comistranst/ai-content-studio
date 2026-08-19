
# AI Content Studio

> A lightweight AI content creation tool built with FastAPI and JavaScript.

## Project Overview

AI Content Studio 是一个帮助内容创作者快速生成营销文案的 AI Web 应用。

第一版（v0.1）目标：

- 根据产品主题生成营销文案
- 支持不同平台
- 保存历史记录
- 调用 AI 模型生成内容

---

## Tech Stack

Frontend

- HTML
- CSS
- JavaScript

Backend

- Python
- FastAPI

Database

- SQLite

Version Control

- Git
- GitHub

---

## Roadmap

- [ ] v0.1 Copywriting
- [ ] v0.2 History
- [ ] v0.3 Prompt Optimizer
- [ ] v0.4 Image Analysis
- [ ] v0.5 Mini Program

---

## Status

🚧 Under Development

---

## Local Development

### 1. Start the backend

Open a terminal and enter the backend directory:

```powershell
cd backend
```

Activate the virtual environment:

```powershell
.venv\Scripts\Activate.ps1
```

Start the FastAPI development server:

```powershell
uvicorn app.main:app --reload
```

After the server starts, open:

```text
http://127.0.0.1:8000/docs
```

### 2. Open the frontend

Open the frontend project with VS Code, then use the Live Server extension to open `index.html`.

The frontend should run on one of the local addresses already allowed by the backend CORS configuration, such as:

```text
http://127.0.0.1:5500
```

### 3. Run tests

In the `backend` directory with the virtual environment activated, run:

```powershell
pytest -q
```

Current test status:

```text
8 passed
```

---

## Screenshots

Screenshots will be added in a future update.

Recommended screenshots:

- Content generation form
- Generated copywriting result
- Generation history list
- FastAPI interactive API documentation at `/docs`
