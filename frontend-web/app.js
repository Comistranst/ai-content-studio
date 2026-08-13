console.log("app.js 已成功加载");

const generateButton = document.getElementById("generate-button");
const topicInput = document.getElementById("topic");
const platformSelect = document.getElementById("platform");
const styleSelect = document.getElementById("style");
const resultElement = document.getElementById("result");

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
  resultElement.textContent = "正在请求后端生成文案...";

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
      throw new Error("后端返回了错误请求。");
    }

    resultElement.textContent = result.data.content;
  } catch (error) {
    console.error(error);
    resultElement.textContent =
      "无法连接后端。请确认 FastAPI 服务正在运行。";
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = "生成文案";
  }
});