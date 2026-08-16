console.log("app.js 已成功加载");

const generateButton = document.getElementById("generate-button");
const topicInput = document.getElementById("topic");
const platformSelect = document.getElementById("platform");
const styleSelect = document.getElementById("style");
const resultElement = document.getElementById("result");
const historyList = document.getElementById("history-list");
const refreshHistoryButton = document.getElementById("refresh-history-button");
const loadMoreButton = document.getElementById("load-more-button");

generateButton.addEventListener("click", async () => {
  console.log("生成按钮已点击");

  const topic = topicInput.value.trim();
  const platform = platformSelect.value;
  const style = styleSelect.value;

  if (!topic) {
    resultElement.textContent = "请输入一个主题，例如：瑜伽垫。";
    return;
  }

  generateButton.disabled = true;
  generateButton.textContent = "生成中...";
  resultElement.textContent = "正在请求 AI 生成文案...";

  try {
    const response = await fetch("http://127.0.0.1:8000/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: topic,
        platform: platform,
        style: style,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "生成文案时发生未知错误。");
    }

    resultElement.textContent = result.data.content;
  } catch (error) {
    console.error(error);
    resultElement.textContent = error.message;
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "生成文案";
  }
});

function formatCreatedAt(createdAt) {
  const date = new Date(createdAt);

  return date.toLocaleString("zh-CN", {
    hour12: false,
  });
}

function renderHistory(records) {
  historyList.innerHTML = "";

  if (records.length === 0) {
    historyList.innerHTML = `
      <p class="history-message">暂时还没有历史记录。</p>
    `;
    return;
  }

  records.forEach((record) => {
    const item = document.createElement("article");
    item.className = "history-item";

    const meta = document.createElement("p");
    meta.className = "history-meta";
    meta.textContent =
      `${record.platform} · ${record.style} · ${formatCreatedAt(record.created_at)}`;

    const topic = document.createElement("h3");
    topic.textContent = record.topic;

    const content = document.createElement("p");
    content.className = "history-content";
    content.textContent = record.content;

    item.append(meta, topic, content);
    historyList.appendChild(item);
  });
}

async function loadHistory() {
  refreshHistoryButton.disabled = true;
  refreshHistoryButton.textContent = "加载中...";
  historyList.innerHTML = `
    <p class="history-message">正在加载历史记录...</p>
  `;

  try {
    const response = await fetch(
      "http://127.0.0.1:8000/api/history?limit=10&offset=0"
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "加载历史记录失败。");
    }

    renderHistory(result.data);
  } catch (error) {
    console.error(error);
    historyList.innerHTML = `
      <p class="history-message">${error.message}</p>
    `;
  } finally {
    refreshHistoryButton.disabled = false;
    refreshHistoryButton.textContent = "刷新历史";
  }
}

refreshHistoryButton.addEventListener("click", loadHistory);

loadHistory();