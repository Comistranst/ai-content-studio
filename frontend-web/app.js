console.log("app.js 已成功加载");

const API_BASE_URL = "http://127.0.0.1:8000/api";
const HISTORY_PAGE_SIZE = 10;

const generateButton = document.getElementById("generate-button");
const topicInput = document.getElementById("topic");
const platformSelect = document.getElementById("platform");
const styleSelect = document.getElementById("style");
const audienceInput = document.getElementById("audience");
const lengthSelect = document.getElementById("length");
const resultEmptyState = document.getElementById("result-empty-state");
const resultContent = document.getElementById("result-content");
const resultTitle = document.getElementById("result-title");
const resultBody = document.getElementById("result-body");
const resultHashtags = document.getElementById("result-hashtags");

const copyAllButton = document.getElementById("copy-all-button");
const copyTitleButton = document.getElementById("copy-title-button");
const copyBodyButton = document.getElementById("copy-body-button");

let currentGeneratedContent = null;

const historyList = document.getElementById("history-list");
const refreshHistoryButton = document.getElementById("refresh-history-button");
const loadMoreButton = document.getElementById("load-more-button");

let historyOffset = 0;
let hasMoreHistory = true;

function setResultMessage(message) {
  resultEmptyState.textContent = message;
  resultEmptyState.hidden = false;
  resultContent.hidden = true;
  copyAllButton.disabled = true;
  currentGeneratedContent = null;
}


function renderGeneratedContent(data) {
  currentGeneratedContent = data;

  resultTitle.textContent = data.title || "未生成标题";
  resultBody.textContent = data.body || data.content || "";

  resultHashtags.innerHTML = "";

  const hashtags = data.hashtags || [];

  hashtags.forEach((hashtag) => {
    const tag = document.createElement("span");
    tag.className = "hashtag";
    tag.textContent = hashtag;
    resultHashtags.appendChild(tag);
  });

  if (hashtags.length === 0) {
    resultHashtags.textContent = "未生成标签";
  }

  resultEmptyState.hidden = true;
  resultContent.hidden = false;
  copyAllButton.disabled = false;
}


async function copyText(text, button, defaultLabel) {
  try {
    await navigator.clipboard.writeText(text);

    button.textContent = "已复制";

    setTimeout(() => {
      button.textContent = defaultLabel;
    }, 1500);
  } catch (error) {
    console.error(error);

    button.textContent = "复制失败";

    setTimeout(() => {
      button.textContent = defaultLabel;
    }, 1500);
  }
}

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

  const lengthLabels = {
    short: "短文案",
    medium: "中文案",
    long: "长文案",
  };

  const audience = record.audience || "普通用户";
  const length = lengthLabels[record.content_length] || "中文案";

  meta.textContent =
    `${record.platform} · ${record.style} · ${length} · ${audience} · ${formatCreatedAt(record.created_at)}`;

  const title = document.createElement("h3");
  title.textContent = record.title || record.topic;

  const body = document.createElement("p");
  body.className = "history-content";
  body.textContent = record.body || record.content;

  const hashtags = Array.isArray(record.hashtags)
    ? record.hashtags
    : [];

  const hashtagList = document.createElement("div");
  hashtagList.className = "history-hashtags";

  hashtags.forEach((hashtag) => {
    const tag = document.createElement("span");
    tag.className = "hashtag";
    tag.textContent = hashtag;
    hashtagList.appendChild(tag);
  });

  const actions = document.createElement("div");
  actions.className = "history-actions";

  const copyTitleButton = document.createElement("button");
  copyTitleButton.className = "copy-button";
  copyTitleButton.type = "button";
  copyTitleButton.textContent = "复制标题";

  copyTitleButton.addEventListener("click", () => {
    copyText(
      record.title || record.topic,
      copyTitleButton,
      "复制标题"
    );
  });

  const copyBodyButton = document.createElement("button");
  copyBodyButton.className = "copy-button";
  copyBodyButton.type = "button";
  copyBodyButton.textContent = "复制正文";

  copyBodyButton.addEventListener("click", () => {
    copyText(
      record.body || record.content,
      copyBodyButton,
      "复制正文"
    );
  });

  const copyAllButton = document.createElement("button");
  copyAllButton.className = "copy-button";
  copyAllButton.type = "button";
  copyAllButton.textContent = "复制全部";

  copyAllButton.addEventListener("click", () => {
    const hashtagsText = hashtags.join(" ");

    const text = [
      record.title || record.topic,
      record.body || record.content,
      hashtagsText,
    ]
      .filter(Boolean)
      .join("\n\n");

    copyText(text, copyAllButton, "复制全部");
  });

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "删除";

  deleteButton.addEventListener("click", async () => {
    const confirmed = window.confirm(
      `确定删除“${record.title || record.topic}”这条历史记录吗？`
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

refreshHistoryButton.textContent = "已删除";

setTimeout(() => {
  refreshHistoryButton.textContent = "刷新历史";
}, 1500);
    } catch (error) {
      console.error(error);
      alert(error.message);

      deleteButton.disabled = false;
      deleteButton.textContent = "删除";
    }
  });

  actions.append(
    copyTitleButton,
    copyBodyButton,
    copyAllButton,
    deleteButton
  );

  item.append(
    meta,
    title,
    body,
    hashtagList,
    actions
  );

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
    } else {
      loadMoreButton.textContent = "加载失败，请重试";

      setTimeout(() => {
        loadMoreButton.textContent = "加载更多";
      }, 1500);
    }
  } finally {
    refreshHistoryButton.disabled = false;
    refreshHistoryButton.textContent = "刷新历史";

    loadMoreButton.disabled = false;

    if (reset) {
      loadMoreButton.textContent = "加载更多";
    }
  }
}
generateButton.addEventListener("click", async () => {
const topic = topicInput.value.trim();
const platform = platformSelect.value;
const style = styleSelect.value;
const audience = audienceInput.value.trim() || "普通用户";
const length = lengthSelect.value;

  if (!topic) {
     setResultMessage("请输入一个主题，例如：瑜伽垫。"); 
    return;
  }

  generateButton.disabled = true;
  generateButton.textContent = "生成中...";
  setResultMessage("正在请求 AI 生成文案...");

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
           audience,
           length,
      }),
    });

    const result = await response.json();

      if (!response.ok) {
       if (response.status === 502) {
        throw new Error(
          "AI 服务暂时不可用，请稍后重试。"
        );
      }

      if (response.status === 500) {
        throw new Error(
          "文案已生成，但历史记录保存失败，请稍后重试。"
        );
      }

      throw new Error(
        result.detail || "生成文案时发生未知错误。"
      );
    }

    renderGeneratedContent(result.data);

    await loadHistory({ reset: true });
    } catch (error) {
    console.error(error);

    const message =
      error instanceof TypeError
        ? "无法连接后端服务，请确认后端已启动。"
        : error.message;

    setResultMessage(message);
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
copyTitleButton.addEventListener("click", () => {
  if (!currentGeneratedContent) {
    return;
  }

  copyText(
    currentGeneratedContent.title || "",
    copyTitleButton,
    "复制标题"
  );
});


copyBodyButton.addEventListener("click", () => {
  if (!currentGeneratedContent) {
    return;
  }

  copyText(
    currentGeneratedContent.body || currentGeneratedContent.content || "",
    copyBodyButton,
    "复制正文"
  );
});


copyAllButton.addEventListener("click", () => {
  if (!currentGeneratedContent) {
    return;
  }

  const hashtags = (currentGeneratedContent.hashtags || []).join(" ");

  const text = [
    currentGeneratedContent.title || "",
    currentGeneratedContent.body || "",
    hashtags,
  ]
    .filter(Boolean)
    .join("\n\n");

  copyText(text, copyAllButton, "复制全部");
});
loadHistory({ reset: true });