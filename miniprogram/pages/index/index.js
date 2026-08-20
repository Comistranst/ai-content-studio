const { request } = require("../../utils/request")

Page({
  data: {
    topic: "",
    loading: false,
    result: ""
  },

  onTopicInput(e) {
    this.setData({
      topic: e.detail.value
    })
  },

  async onGenerateTap() {
    const topic = this.data.topic.trim()

    if (!topic) {
      wx.showToast({
        title: "请先输入主题",
        icon: "none"
      })
      return
    }

    this.setData({
      loading: true,
      result: ""
    })

    try {
      const response = await request({
        url: "/api/generate",
        method: "POST",
        data: {
          topic: topic,
          platform: "小红书",
          style: "真实种草",
          audience: "普通用户",
          length: "medium"
        }
      })

      this.setData({
        result: response.data.content
      })

      wx.showToast({
        title: "生成成功",
        icon: "success"
      })
    } catch (error) {
      console.error("生成失败：", error)

      wx.showToast({
        title: error.message || "生成失败",
        icon: "none"
      })
    } finally {
      this.setData({
        loading: false
      })
    }
  },

  onCopyTap() {
    wx.setClipboardData({
      data: this.data.result
    })
  }
})