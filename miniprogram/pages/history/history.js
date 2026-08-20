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
  },

  onDeleteTap(e) {
    const id = e.currentTarget.dataset.id
    const topic = e.currentTarget.dataset.topic

    wx.showModal({
      title: "删除历史记录",
      content: `确定删除“${topic}”这条文案吗？删除后无法恢复。`,
      confirmText: "删除",
      confirmColor: "#d93025",
      success: (res) => {
        if (res.confirm) {
          this.deleteHistory(id)
        }
      }
    })
  },

  async deleteHistory(id) {
    wx.showLoading({
      title: "删除中…",
      mask: true
    })

    try {
      await request({
        url: `/api/history/${id}`,
        method: "DELETE"
      })

      const updatedHistory = this.data.history.filter((item) => {
        return item.id !== id
      })

      this.setData({
        history: updatedHistory
      })

      wx.showToast({
        title: "已删除",
        icon: "success"
      })
    } catch (error) {
      console.error("删除历史记录失败：", error)

      wx.showToast({
        title: error.message || "删除失败",
        icon: "none"
      })
    } finally {
      wx.hideLoading()
    }
  }
})