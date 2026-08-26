const { BASE_URL } = require("./config");

function request({ url, method = "GET", data = {} }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        "content-type": "application/json"
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject({
            message: `请求失败：${res.statusCode}`
          });
        }
      },
      fail(error) {
        console.error("网络请求失败：", error);

        reject({
          message: error.errMsg || "无法连接后端"
        });
      }
    });
  });
}

module.exports = {
  request
};