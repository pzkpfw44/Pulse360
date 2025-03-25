import apiClient from './apiClient'

const cycleService = {
  // Get all cycles
  async getAllCycles(query = '', status = null, subjectId = null, templateId = null, limit = 50, offset = 0) {
    try {
      const params = { limit, offset }
      
      if (query) {
        params.query = query
      }
      
      if (status) {
        params.status = status
      }
      
      if (subjectId) {
        params.subject_id = subjectId
      }
      
      if (templateId) {
        params.template_id = templateId
      }
      
      const response = await apiClient.get('/cycles', { params })
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get cycles created by current user
  async getMyCycles(query = '', status = null, subjectId = null, templateId = null, limit = 50, offset = 0) {
    try {
      const params = { limit, offset }
      
      if (query) {
        params.query = query
      }
      
      if (status) {
        params.status = status
      }
      
      if (subjectId) {
        params.subject_id = subjectId
      }
      
      if (templateId) {
        params.template_id = templateId
      }
      
      const response = await apiClient.get('/cycles/my', { params })
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get cycle by ID
  async getCycleById(id) {
    try {
      const response = await apiClient.get(`/cycles/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Create cycle
  async createCycle(cycleData) {
    try {
      const response = await apiClient.post('/cycles', cycleData)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Update cycle
  async updateCycle(id, cycleData) {
    try {
      const response = await apiClient.put(`/cycles/${id}`, cycleData)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Delete cycle
  async deleteCycle(id) {
    try {
      const response = await apiClient.delete(`/cycles/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get cycle status
  async getCycleStatus(id) {
    try {
      const response = await apiClient.get(`/cycles/${id}/status`)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Send invitations
  async sendInvitations(cycleId, evaluators, message = null) {
    try {
      const response = await apiClient.post(`/cycles/${cycleId}/send-invitations`, {
        evaluators,
        message
      })
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Send reminders
  async sendReminders(cycleId, evaluatorIds = null, message = null) {
    try {
      const response = await apiClient.post(`/cycles/${cycleId}/send-reminders`, {
        evaluator_ids: evaluatorIds,
        message
      })
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Generate report
  async generateReport(cycleId, includeComments = true, anonymize = true, format = 'pdf', background = true) {
    try {
      const response = await apiClient.post(`/cycles/${cycleId}/generate-report`, {
        include_comments: includeComments,
        anonymize: anonymize,
        format: format
      }, {
        params: { background }
      })
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get report download URL
  getReportDownloadUrl(cycleId) {
    return `${apiClient.defaults.baseURL}/cycles/${cycleId}/report`
  },
  
  // Get cycle analytics
  async getCycleAnalytics(cycleId) {
    try {
      const response = await apiClient.get(`/cycles/${cycleId}/analytics`)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get AI summary
  async getAISummary(cycleId) {
    try {
      const response = await apiClient.get(`/cycles/${cycleId}/ai-summary`)
      return response.data
    } catch (error) {
      throw error
    }
  }
}

export default cycleService