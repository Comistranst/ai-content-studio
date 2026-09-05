console.log("app.js 已成功加载");

const API_BASE_URL = "https://ai-content-studio-vp7l.onrender.com/api";
const HISTORY_PAGE_SIZE = 10;
const PROJECTS_PAGE_SIZE = 20;
const PROJECT_VERSIONS_PAGE_SIZE = 20;

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

const saveAsProjectButton = document.getElementById(
  "save-as-project-button"
);
const copyAllButton = document.getElementById("copy-all-button");
const copyTitleButton = document.getElementById("copy-title-button");
const copyBodyButton = document.getElementById("copy-body-button");

const optimizeContentInput = document.getElementById("optimize-content");
const optimizeGoalSelect = document.getElementById("optimize-goal");
const optimizeButton = document.getElementById("optimize-button");
const optimizeEmptyState = document.getElementById("optimize-empty-state");
const optimizeResultContent = document.getElementById(
  "optimize-result-content"
);
const optimizedContent = document.getElementById("optimized-content");
const copyOptimizedButton = document.getElementById(
  "copy-optimized-button"
);
const saveOptimizedVersionButton = document.getElementById(
  "save-optimized-version-button"
);
const useGeneratedContentButton = document.getElementById(
  "use-generated-content-button"
);

const historyList = document.getElementById("history-list");
const refreshHistoryButton = document.getElementById(
  "refresh-history-button"
);
const loadMoreButton = document.getElementById("load-more-button");

const projectsList = document.getElementById("projects-list");
const refreshProjectsButton = document.getElementById(
  "refresh-projects-button"
);

const projectDetail = document.getElementById("project-detail");
const projectDetailMeta = document.getElementById(
  "project-detail-meta"
);
const projectDetailTitle = document.getElementById(
  "project-detail-title"
);
const closeProjectDetailButton = document.getElementById(
  "close-project-detail-button"
);
const projectVersionMessage = document.getElementById(
  "project-version-message"
);
const projectVersionsList = document.getElementById(
  "project-versions-list"
);

let currentGeneratedContent = null;
let currentOptimizedContent = "";
let currentProjectId = null;

let historyOffset = 0;
let hasMoreHistory = true;

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof TypeError) {
    return "无法连接后端服务，请稍后重试。";
  }

  return error.message || fallbackMessage;
}

function formatCreatedAt(createdAt) {
  const date = new Date(createdAt);

  return date.toLocaleString("zh-CN", {
    hour12: false,
  });
}

function getProjectStatusLabel(status) {
  return status === "final" ? "已定稿" : "草稿中";
}

function getVersionSourceLabel(version) {
  const labels = {
    generated: "AI 初稿",
    optimized: "优化稿",
    manual: "手动编辑稿",
  };

  if (
    version.source_type === "optimized" &&
    version.optimization_goal
  ) {
    return `优化稿 · ${version.optimization_goal}`;
  }

  return labels[version.source_type] || "文案版本";
}

function setResultMessage(message) {
  resultEmptyState.textContent = message;
  resultEmptyState.hidden = false;
  resultContent.hidden = true;

  copyAllButton.disabled = true;
  copyTitleButton.disabled = true;
  copyBodyButton.disabled = true;
  saveAsProjectButton.disabled = true;

  currentGeneratedContent = null;
}

function renderGeneratedContent(data) {
  currentGeneratedContent = data;

  resultTitle.textContent = data.title || "未生成标题";
  resultBody.textContent = data.body || data.content || "";

  resultHashtags.innerHTML = "";

  const hashtags = Array.isArray(data.hashtags)
    ? data.hashtags
    : [];

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
  copyTitleButton.disabled = false;
  copyBodyButton.disabled = false;
  saveAsProjectButton.disabled = false;
}

function setOptimizeMessage(message) {
  optimizeEmptyState.textContent = message;
  optimizeEmptyState.hidden = false;
  optimizeResultContent.hidden = true;

  copyOptimizedButton.disabled = true;
  saveOptimizedVersionButton.disabled = true;

  currentOptimizedContent = "";
}

function renderOptimizedContent(content) {
  currentOptimizedContent = content;
  optimizedContent.textContent = content;

  optimizeEmptyState.hidden = true;
  optimizeResultContent.hidden = false;

  copyOptimizedButton.disabled = false;

  /*
    这里故意直接开放按钮。

    真正提交时 saveOptimizedContentAsVersion()
    仍会检查 currentProjectId 是否存在，
    所以不会因误点而保存到错误项目。
  */
  saveOptimizedVersionButton.disabled = false;
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

async function saveCurrentContentAsProject() {
  if (!currentGeneratedContent) {
    setResultMessage("请先生成一篇文案，再保存为内容项目。");
    return;
  }

  const topic = topicInput.value.trim();
  const platform = platformSelect.value;
  const style = styleSelect.value;
  const audience = audienceInput.value.trim() || "普通用户";
  const length = lengthSelect.value;

  saveAsProjectButton.disabled = true;
  saveAsProjectButton.textContent = "保存中...";

  try {
    const projectResponse = await fetch(
      `${API_BASE_URL}/projects`,
      {
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
      }
    );

    const projectResult = await projectResponse.json();

    if (!projectResponse.ok) {
      throw new Error(
        projectResult.detail || "创建内容项目失败。"
      );
    }

    const project = projectResult.data;

    if (!project || !project.id) {
      throw new Error("创建项目成功，但未返回项目 ID。");
    }

    const hashtags = Array.isArray(
      currentGeneratedContent.hashtags
    )
      ? currentGeneratedContent.hashtags
      : [];

    const title = currentGeneratedContent.title || topic;

    const body =
      currentGeneratedContent.body ||
      currentGeneratedContent.content ||
      "";

    const content = [title, body, hashtags.join(" ")]
      .filter(Boolean)
      .join("\n\n");

    const versionResponse = await fetch(
      `${API_BASE_URL}/projects/${project.id}/versions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_type: "generated",
          optimization_goal: null,
          title,
          body,
          hashtags,
          content,
        }),
      }
    );

    const versionResult = await versionResponse.json();

    if (!versionResponse.ok) {
      throw new Error(
        versionResult.detail || "保存项目初稿失败。"
      );
    }

    /*
      关键修复：
      保存项目成功后立即记录当前项目 ID。
      后续优化结果即可保存到同一个项目。
    */
    currentProjectId = project.id;

    saveAsProjectButton.textContent = "已保存";

    await loadProjects();
    await loadProjectDetail(project.id);
  } catch (error) {
    console.error(error);

    alert(getErrorMessage(error, "保存内容项目失败。"));
  } finally {
    saveAsProjectButton.disabled = false;

    setTimeout(() => {
      saveAsProjectButton.textContent = "保存为内容项目";
    }, 1500);
  }
}

async function saveOptimizedContentAsVersion() {
  if (!currentProjectId) {
    alert(
      "尚未选中内容项目。请先点击“保存为内容项目”，或在内容项目列表中点击“打开项目”。"
    );
    return;
  }

  if (!currentOptimizedContent) {
    setOptimizeMessage("请先完成文案优化，再保存版本。");
    return;
  }

  const goal = optimizeGoalSelect.value;

  const fallbackTitle = currentGeneratedContent
    ? currentGeneratedContent.title
    : topicInput.value.trim() || "优化文案";

  saveOptimizedVersionButton.disabled = true;
  saveOptimizedVersionButton.textContent = "保存中...";

  try {
    const response = await fetch(
      `${API_BASE_URL}/projects/${currentProjectId}/versions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_type: "optimized",
          optimization_goal: goal,
          title: fallbackTitle,
          body: currentOptimizedContent,
          hashtags: [],
          content: currentOptimizedContent,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.detail || "保存优化版本失败。"
      );
    }

    saveOptimizedVersionButton.textContent = "已保存";

    await loadProjects();
    await loadProjectDetail(currentProjectId);
  } catch (error) {
    console.error(error);

    alert(getErrorMessage(error, "保存优化版本失败。"));
  } finally {
    saveOptimizedVersionButton.disabled = false;

    setTimeout(() => {
      saveOptimizedVersionButton.textContent = "保存为项目版本";
    }, 1500);
  }
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
  const length =
    lengthLabels[record.content_length] || "中文案";

  meta.textContent =
    `${record.platform} · ${record.style} · ` +
    `${length} · ${audience} · ` +
    `${formatCreatedAt(record.created_at)}`;

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

  const historyCopyTitleButton = document.createElement("button");
  historyCopyTitleButton.className = "copy-button";
  historyCopyTitleButton.type = "button";
  historyCopyTitleButton.textContent = "复制标题";

  historyCopyTitleButton.addEventListener("click", () => {
    copyText(
      record.title || record.topic,
      historyCopyTitleButton,
      "复制标题"
    );
  });

  const historyCopyBodyButton = document.createElement("button");
  historyCopyBodyButton.className = "copy-button";
  historyCopyBodyButton.type = "button";
  historyCopyBodyButton.textContent = "复制正文";

  historyCopyBodyButton.addEventListener("click", () => {
    copyText(
      record.body || record.content,
      historyCopyBodyButton,
      "复制正文"
    );
  });

  const historyCopyAllButton = document.createElement("button");
  historyCopyAllButton.className = "copy-button";
  historyCopyAllButton.type = "button";
  historyCopyAllButton.textContent = "复制全部";

  historyCopyAllButton.addEventListener("click", () => {
    const text = [
      record.title || record.topic,
      record.body || record.content,
      hashtags.join(" "),
    ]
      .filter(Boolean)
      .join("\n\n");

    copyText(text, historyCopyAllButton, "复制全部");
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
        throw new Error(
          result.detail || "删除历史记录失败。"
        );
      }

      item.remove();

      refreshHistoryButton.textContent = "已删除";

      setTimeout(() => {
        refreshHistoryButton.textContent = "刷新历史";
      }, 1500);
    } catch (error) {
      console.error(error);

      alert(getErrorMessage(error, "删除历史记录失败。"));

      deleteButton.disabled = false;
      deleteButton.textContent = "删除";
    }
  });

  actions.append(
    historyCopyTitleButton,
    historyCopyBodyButton,
    historyCopyAllButton,
    deleteButton
  );

  item.append(meta, title, body, hashtagList, actions);

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

function createProjectItem(project) {
  const item = document.createElement("article");
  item.className = "history-item project-item";

  const meta = document.createElement("p");
  meta.className = "history-meta";

  meta.textContent =
    `${project.platform} · ${project.style} · ` +
    `${getProjectStatusLabel(project.status)} · ` +
    `${formatCreatedAt(project.updated_at)}`;

  const title = document.createElement("h3");
  title.textContent = project.topic;

  const description = document.createElement("p");
  description.className = "history-content";
  description.textContent =
    `受众：${project.audience} · 篇幅：${project.length}`;

  const actions = document.createElement("div");
  actions.className = "history-actions";

  const openButton = document.createElement("button");
  openButton.className = "copy-button";
  openButton.type = "button";
  openButton.textContent = "打开项目";

  openButton.addEventListener("click", () => {
    loadProjectDetail(project.id);
  });

  actions.appendChild(openButton);
  item.append(meta, title, description, actions);

  return item;
}

function renderProjects(projects) {
  projectsList.innerHTML = "";

  if (projects.length === 0) {
    projectsList.innerHTML = `
      <p class="history-message">暂时还没有内容项目。</p>
    `;
    return;
  }

  projects.forEach((project) => {
    projectsList.appendChild(createProjectItem(project));
  });
}

function createVersionItem(version) {
  const item = document.createElement("article");
  item.className = "result-section project-version-item";

  const header = document.createElement("div");
  header.className = "result-section-header";

  const heading = document.createElement("h3");
  heading.textContent = getVersionSourceLabel(version);

  const status = document.createElement("span");
  status.className = "project-version-status";
  status.textContent = version.is_final ? "最终稿" : "版本";

  header.append(heading, status);

  const title = document.createElement("p");
  title.className = "result-title";
  title.textContent = version.title;

  const body = document.createElement("p");
  body.className = "result-body";
  body.textContent = version.body || version.content;

  const hashtags = Array.isArray(version.hashtags)
    ? version.hashtags
    : [];

  const hashtagList = document.createElement("div");
  hashtagList.className = "result-hashtags";

  hashtags.forEach((hashtag) => {
    const tag = document.createElement("span");
    tag.className = "hashtag";
    tag.textContent = hashtag;
    hashtagList.appendChild(tag);
  });

  const actions = document.createElement("div");
  actions.className = "history-actions";

  const copyButton = document.createElement("button");
  copyButton.className = "copy-button";
  copyButton.type = "button";
  copyButton.textContent = "复制版本";

  copyButton.addEventListener("click", () => {
    copyText(version.content, copyButton, "复制版本");
  });

  actions.appendChild(copyButton);

  if (!version.is_final) {
    const finalButton = document.createElement("button");
    finalButton.className = "copy-button";
    finalButton.type = "button";
    finalButton.textContent = "设为最终稿";

    finalButton.addEventListener("click", async () => {
      finalButton.disabled = true;
      finalButton.textContent = "设置中...";

      try {
        const response = await fetch(
          `${API_BASE_URL}/versions/${version.id}/final`,
          {
            method: "PATCH",
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.detail || "设置最终稿失败。"
          );
        }

        projectVersionMessage.textContent = "已设置为最终稿。";

        await loadProjectDetail(version.project_id);
        await loadProjects();
      } catch (error) {
        console.error(error);

        alert(getErrorMessage(error, "设置最终稿失败。"));

        finalButton.disabled = false;
        finalButton.textContent = "设为最终稿";
      }
    });

    actions.appendChild(finalButton);
  }

  item.append(header, title, body, hashtagList, actions);

  return item;
}

function renderProjectVersions(versions) {
  projectVersionsList.innerHTML = "";

  if (versions.length === 0) {
    projectVersionsList.innerHTML = `
      <p class="history-message">
        该项目还没有保存任何文案版本。
      </p>
    `;
    return;
  }

  versions.forEach((version) => {
    projectVersionsList.appendChild(createVersionItem(version));
  });
}

async function loadProjects() {
  refreshProjectsButton.disabled = true;
  refreshProjectsButton.textContent = "加载中...";

  projectsList.innerHTML = `
    <p class="history-message">正在加载内容项目...</p>
  `;

  try {
    const response = await fetch(
      `${API_BASE_URL}/projects?limit=${PROJECTS_PAGE_SIZE}&offset=0`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.detail || "加载内容项目失败。"
      );
    }

    renderProjects(result.data);
  } catch (error) {
    console.error(error);

    const message = getErrorMessage(
      error,
      "加载内容项目失败。"
    );

    projectsList.innerHTML = `
      <p class="history-message">${message}</p>
    `;
  } finally {
    refreshProjectsButton.disabled = false;
    refreshProjectsButton.textContent = "刷新项目";
  }
}

async function loadProjectDetail(projectId) {
  currentProjectId = projectId;

  projectDetail.hidden = false;
  projectDetailMeta.textContent = "正在加载项目详情...";
  projectDetailTitle.textContent = "";
  projectVersionMessage.textContent = "";

  projectVersionsList.innerHTML = `
    <p class="history-message">正在加载文案版本...</p>
  `;

  try {
    const [projectResponse, versionsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/projects/${projectId}`),
      fetch(
        `${API_BASE_URL}/projects/${projectId}/versions` +
          `?limit=${PROJECT_VERSIONS_PAGE_SIZE}&offset=0`
      ),
    ]);

    const projectResult = await projectResponse.json();
    const versionsResult = await versionsResponse.json();

    if (!projectResponse.ok) {
      throw new Error(
        projectResult.detail || "加载项目详情失败。"
      );
    }

    if (!versionsResponse.ok) {
      throw new Error(
        versionsResult.detail || "加载项目版本失败。"
      );
    }

    const project = projectResult.data;

    projectDetailMeta.textContent =
      `${project.platform} · ${project.style} · ` +
      `受众：${project.audience} · ` +
      `${getProjectStatusLabel(project.status)}`;

    projectDetailTitle.textContent = project.topic;

    projectVersionMessage.textContent =
      `共 ${versionsResult.pagination.count} 个版本`;

    renderProjectVersions(versionsResult.data);

    projectDetail.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  } catch (error) {
    console.error(error);

    const message = getErrorMessage(
      error,
      "加载项目详情失败。"
    );

    projectDetailMeta.textContent = "";
    projectDetailTitle.textContent = "加载项目失败";
    projectVersionMessage.textContent = "";

    projectVersionsList.innerHTML = `
      <p class="history-message">${message}</p>
    `;
  }
}

function updateLoadMoreButton() {
  loadMoreButton.style.display = hasMoreHistory
    ? "block"
    : "none";
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
      throw new Error(
        result.detail || "加载历史记录失败。"
      );
    }

    const records = result.data;

    renderHistory(records, reset);

    historyOffset += records.length;
    hasMoreHistory = records.length === HISTORY_PAGE_SIZE;

    updateLoadMoreButton();
  } catch (error) {
    console.error(error);

    const message = getErrorMessage(
      error,
      "加载历史记录失败。"
    );

    if (reset) {
      historyList.innerHTML = `
        <p class="history-message">${message}</p>
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

    setResultMessage(
      getErrorMessage(error, "生成文案失败。")
    );
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "生成文案";
  }
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
    currentGeneratedContent.body ||
      currentGeneratedContent.content ||
      "",
    copyBodyButton,
    "复制正文"
  );
});

copyAllButton.addEventListener("click", () => {
  if (!currentGeneratedContent) {
    return;
  }

  const hashtags = (
    currentGeneratedContent.hashtags || []
  ).join(" ");

  const text = [
    currentGeneratedContent.title || "",
    currentGeneratedContent.body ||
      currentGeneratedContent.content ||
      "",
    hashtags,
  ]
    .filter(Boolean)
    .join("\n\n");

  copyText(text, copyAllButton, "复制全部");
});

saveAsProjectButton.addEventListener("click", () => {
  saveCurrentContentAsProject();
});

useGeneratedContentButton.addEventListener("click", () => {
  if (!currentGeneratedContent) {
    setOptimizeMessage(
      "请先生成一篇文案，再使用当前生成结果。"
    );
    return;
  }

  const hashtags = (
    currentGeneratedContent.hashtags || []
  ).join(" ");

  const content = [
    currentGeneratedContent.title || "",
    currentGeneratedContent.body ||
      currentGeneratedContent.content ||
      "",
    hashtags,
  ]
    .filter(Boolean)
    .join("\n\n");

  optimizeContentInput.value = content;

  setOptimizeMessage(
    "已填入当前生成结果，请选择目标后点击“优化文案”。"
  );

  optimizeContentInput.focus();
});

optimizeButton.addEventListener("click", async () => {
  const content = optimizeContentInput.value.trim();
  const goal = optimizeGoalSelect.value;

  if (!content) {
    setOptimizeMessage("请先粘贴或输入需要优化的文案。");
    optimizeContentInput.focus();
    return;
  }

  optimizeButton.disabled = true;
  optimizeButton.textContent = "优化中...";

  setOptimizeMessage("正在请求 AI 优化文案...");

  try {
    const response = await fetch(`${API_BASE_URL}/optimize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        goal,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.detail || "优化文案时发生未知错误。"
      );
    }

    renderOptimizedContent(result.data.optimized_content);
  } catch (error) {
    console.error(error);

    setOptimizeMessage(
      getErrorMessage(error, "优化文案失败。")
    );
  } finally {
    optimizeButton.disabled = false;
    optimizeButton.textContent = "优化文案";
  }
});

copyOptimizedButton.addEventListener("click", () => {
  if (!currentOptimizedContent) {
    return;
  }

  copyText(
    currentOptimizedContent,
    copyOptimizedButton,
    "复制优化结果"
  );
});

saveOptimizedVersionButton.addEventListener("click", () => {
  saveOptimizedContentAsVersion();
});

refreshHistoryButton.addEventListener("click", () => {
  loadHistory({ reset: true });
});

loadMoreButton.addEventListener("click", () => {
  loadHistory();
});

refreshProjectsButton.addEventListener("click", () => {
  loadProjects();
});

closeProjectDetailButton.addEventListener("click", () => {
  currentProjectId = null;

  projectDetail.hidden = true;
  projectVersionsList.innerHTML = "";
  projectVersionMessage.textContent = "";
});

loadHistory({ reset: true });
loadProjects();