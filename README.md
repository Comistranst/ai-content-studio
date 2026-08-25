# AI Content Studio

> 一个面向中文社交媒体内容创作的全栈 AI 文案工具，包含 Web 网页端和微信小程序端，并复用同一套 FastAPI 后端 API。

## 项目简介

AI Content Studio 帮助内容创作者将一个主题快速转化为可发布的中文社交媒体文案。用户可以选择平台、文案风格、目标受众和内容长度，生成 AI 文案；随后可以查看历史记录、复制文案或删除不需要的记录。

项目采用清晰的前后端分离结构：

- **FastAPI 后端**：负责请求校验、调用 AI、保存记录和提供 API。
- **Web 网页端**：提供浏览器中的内容生成与历史管理体验。
- **微信小程序端**：作为移动客户端，复用已验证的后端 API。
- **SQLite**：在本地开发环境中保存文案历史记录。

## 已实现功能

- 根据主题生成中文营销文案和社交媒体文案
- 支持平台、风格、目标受众和文案长度输入
- 结构化返回标题、正文、标签和完整文案
- 使用 SQLite 保存生成历史
- 支持查看历史记录与分页参数
- 支持复制新生成文案和历史文案
- 支持删除历史记录，并有二次确认提示
- 对非法输入、AI 服务异常和数据库异常进行友好错误处理
- 微信小程序生成页与历史记录页
- 已完成小程序真机调试

## 技术栈

| 模块 | 技术 |
|---|---|
| 后端 | Python、FastAPI、Pydantic |
| AI 调用 | DeepSeek API |
| 数据库 | SQLite |
| 网页前端 | HTML、CSS、JavaScript |
| 微信小程序 | 原生微信小程序、WXML、WXSS、JavaScript |
| 测试 | pytest、FastAPI TestClient |
| 版本控制 | Git、GitHub |

## 项目结构

```text
ai-content-studio/
├── backend/
│   ├── app/
│   │   ├── ai_service.py       # AI 调用逻辑
│   │   ├── prompts.py          # Prompt 模板
│   │   ├── main.py             # FastAPI 入口
│   │   └── ...
│   ├── data/                   # SQLite 数据
│   ├── tests/
│   │   ├── test_delete_history.py
│   │   ├── test_generate.py
│   │   ├── test_health.py
│   │   └── test_history.py
│   ├── .env.example
│   └── requirements.txt
├── frontend-web/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── miniprogram/
│   ├── pages/
│   │   ├── index/              # 文案生成页
│   │   └── history/            # 历史记录页
│   ├── utils/
│   │   ├── config.js           # 本地 API 地址配置
│   │   └── request.js          # 请求封装
│   ├── app.js
│   ├── app.json
│   └── app.wxss
├── screenshots/
└── README.md
```

## API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/generate` | 生成并保存 AI 文案 |
| `GET` | `/api/history` | 获取已保存的历史记录 |
| `DELETE` | `/api/history/{generation_id}` | 删除一条历史记录 |

### 生成文案请求示例

```json
{
  "topic": "一家云南咖啡店",
  "platform": "小红书",
  "style": "真实种草",
  "audience": "普通用户",
  "length": "medium"
}
```

### 生成文案响应结构

```json
{
  "success": true,
  "data": {
    "id": 1,
    "topic": "一家云南咖啡店",
    "title": "标题示例",
    "body": "正文示例",
    "hashtags": ["#云南咖啡", "#小红书"],
    "content": "标题：标题示例\n\n正文：正文示例\n\n标签：#云南咖啡 #小红书"
  }
}
```

## 本地运行

### 1. 配置环境变量

进入后端目录，并从模板创建本地 `.env` 文件：

```powershell
cd backend
Copy-Item .env.example .env
```

在 `.env` 中填写你的 DeepSeek API Key。

> 不要将 `.env`、API Key、密码或其他密钥提交到 GitHub。

### 2. 启动 FastAPI 后端

```powershell
cd backend
.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

启动后可在浏览器打开 FastAPI 接口文档：

```text
http://127.0.0.1:8000/docs
```

### 3. 运行 Web 网页端

使用 VS Code 的 Live Server 打开：

```text
frontend-web/index.html
```

并确保该网页地址已在 FastAPI 的 CORS 配置中允许，例如：

```text
http://127.0.0.1:5500
```

### 4. 运行测试

在 `backend` 目录、且虚拟环境已经激活的终端中运行：

```powershell
pytest -v
```

当前测试结果：

```text
8 passed
```

目前测试覆盖：健康检查、生成成功、空主题校验、数据库保存失败、历史记录查询、分页参数校验、删除成功和删除不存在记录的 404 情况。

## 微信小程序

小程序端不保存 DeepSeek Key，也不包含 AI、Prompt 或 SQLite 逻辑。它只调用已由后端实现并验证过的接口：

```text
POST /api/generate
GET /api/history
DELETE /api/history/{generation_id}
```

### 本地调试步骤

1. 使用微信开发者工具打开 `miniprogram` 文件夹。
2. 用以下命令启动 FastAPI：

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

3. 在终端执行以下命令，查看当前 Wi-Fi 的 IPv4 地址：

```powershell
ipconfig
```

4. 修改 `miniprogram/utils/config.js` 中的本地 API 地址：

```js
const BASE_URL = "http://你的局域网IP:8000";

module.exports = {
  BASE_URL
};
```

5. 在微信开发者工具中开启：

```text
详情 → 本地设置 → 不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书
```

6. 真机调试时，确保手机和电脑连接到同一个 Wi-Fi。
7. 如果手机无法访问 FastAPI，需要在 Windows 防火墙中允许 TCP `8000` 入站连接。

> 电脑重启或重新连接 Wi-Fi 后，局域网 IP 可能变化。若小程序显示“无法连接后端”，请重新执行 `ipconfig` 并更新 `config.js`。局域网 IP + HTTP 仅用于本地开发调试。

## 项目截图

### 内容生成表单

![内容生成表单](screenshots/generate-form.png)

### AI 生成结果

![AI 生成文案结果](screenshots/generated-result.png)

### FastAPI 接口文档

![FastAPI 交互式接口文档](screenshots/api-docs.png)

### 历史记录

![历史记录](screenshots/history.png)

## 开发进度

- [x] FastAPI 后端与 API 输入校验
- [x] DeepSeek 文案生成
- [x] SQLite 历史记录持久化
- [x] Web 网页端生成和历史管理
- [x] API 自动化测试
- [x] 微信小程序客户端
- [x] 小程序真机调试
- [ ] 将后端部署到公网 HTTPS 环境
- [ ] 生产环境迁移 SQLite 到 PostgreSQL
- [ ] 配置生产环境 CORS 和环境变量
- [ ] 配置小程序 request 合法 HTTPS 域名
- [ ] 增加电影 / 艺术 / 内容创作垂直模式

## 当前状态

**本地 MVP 已完成。**

Web 网页端和微信小程序端均已复用同一套 FastAPI API。下一阶段将完成公网部署、HTTPS 配置和生产数据库迁移，使项目成为可公开访问和展示的作品。
