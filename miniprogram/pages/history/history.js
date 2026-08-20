const { request } = require("../../utils/request")

Page({
  data: {
    loading: false,
    history: []
  },

  onShow() {
    this.loadHistory()
  },

  async loadHistory() {
    this.setData({
      loading: true
    })

    try {
      const response = await request({
        url: "/api/history",
        method: "GET"
      })

      console.log("历史记录接口返回：", response)

      this.setData({
        history: response.data || []
      })
    } catch (error) {
      console.error("加载历史记录失败：", error)

      wx.showToast({
        title: error.message || "加载历史失败",
        icon: "none"
      })
    } finally {
      this.setData({
        loading: false
      })
    }
  },

  onCopyTap(e) {
    const content = e.currentTarget.dataset.content

    wx.setClipboardData({
      data: content
    })
  }
})