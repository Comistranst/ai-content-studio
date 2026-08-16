console.log("app.js 已成功加载");

const API_BASE_URL = "http://127.0.0.1:8000/api";
const HISTORY_PAGE_SIZE = 10;

const generateButton = document.getElementById("generate-button");
const topicInput = document.getElementById("topic");
const platformSelect = document.getElementById("platform");
const styleSelect = document.getElementById("style");
const resultElement = document.getElementById("result");

const historyList = document.getElementById("history-list");
const refreshHistoryButton = document.getElementById("refresh-history-button");
const loadMoreButton = document.getElementById("load-more-button");

let historyOffset = 0;
let hasMoreHistory = true;

function formatCreatedAt(createdAt) {
  const date = new Date(createdAt);

  return date.toLocaleString("zh-CN", {
    hour12: false,
  });
}

function createHistoryItem(record) {
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

  const actions = document.createElement("div");
  actions.className = "history-actions";

  const copyButton = document.createElement("button");
  copyButton.className = "copy-button";
  copyButton.type = "button";
  copyButton.textContent = "复制文案";

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(record.content);

      copyButton.textContent = "已复制";

      setTimeout(() => {
        copyButton.textContent = "复制文案";
      }, 1500);
    } catch (error) {
      console.error(error);
      copyButton.textContent = "复制失败";

      setTimeout(() => {
        copyButton.textContent = "复制文案";
      }, 1500);
    }
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "删除";

  deleteButton.addEventListener("click", async () => {
    const confirmed = window.confirm(
      `确定删除“${record.topic}”这条历史记录吗？`
    );

    if (!confirmed) {
      return;
    }

    deleteButton.disabled = true;
    deleteButton.textContent = "删除中...";

    try {
      const response = await fetch(
        `${API_BASE_URL}/history/${record.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "删除历史记录失败。");
      }

      item.remove();
    } catch (error) {
      console.error(error);
      alert(error.message);

      deleteButton.disabled = false;
      deleteButton.textContent = "删除";
    }
  });

  actions.append(copyButton, deleteButton);
  item.append(meta, topic, content, actions);

  return item;
}

function renderHistory(records, shouldReplace = false) {
  if (shouldReplace) {
    historyList.innerHTML = "";
  }

  if (records.length === 0 && shouldReplace) {
    historyList.innerHTML = `
      <p class="history-message">暂时还没有历史记录。</p>
    `;
    return;
  }

  records.forEach((record) => {
    historyList.appendChild(createHistoryItem(record));
  });
}

function updateLoadMoreButton() {
  loadMoreButton.style.display = hasMoreHistory ? "block" : "none";
}

async function loadHistory({ reset = false } = {}) {
  if (reset) {
    historyOffset = 0;
    hasMoreHistory = true;

    refreshHistoryButton.disabled = true;
    refreshHistoryButton.textContent = "加载中...";
    historyList.innerHTML = `
      <p class="history-message">正在加载历史记录...</p>
    `;
  } else {
    loadMoreButton.disabled = true;
    loadMoreButton.textContent = "加载中...";
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/history?limit=${HISTORY_PAGE_SIZE}&offset=${historyOffset}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "加载历史记录失败。");
    }

    const records = result.data;

    renderHistory(records, reset);

    historyOffset += records.length;
    hasMoreHistory = records.length === HISTORY_PAGE_SIZE;

    updateLoadMoreButton();
  } catch (error) {
    console.error(error);

    if (reset) {
      historyList.innerHTML = `
        <p class="history-message">${error.message}</p>
      `;
    }
  } finally {
    refreshHistoryButton.disabled = false;
    refreshHistoryButton.textContent = "刷新历史";

    loadMoreButton.disabled = false;
    loadMoreButton.textContent = "加载更多";
  }
}

generateButton.addEventListener("click", async () => {
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
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        platform,
        style,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "生成文案时发生未知错误。");
    }

    resultElement.textContent = result.data.content;

    await loadHistory({ reset: true });
  } catch (error) {
    console.error(error);
    resultElement.textContent = error.message;
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "生成文案";
  }
});

refreshHistoryButton.addEventListener("click", () => {
  loadHistory({ reset: true });
});

loadMoreButton.addEventListener("click", () => {
  loadHistory();
});

loadHistory({ reset: true });