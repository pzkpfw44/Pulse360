import apiClient from './apiClient'

const templateService = {
  // Get all templates
  async getAllTemplates(query = '', isDefault = null, limit = 50, offset = 0) {
    try {
      const params = { limit, offset }
      
      if (query) {
        params.query = query
      }
      
      if (isDefault !== null) {
        params.is_default = isDefault
      }
      
      const response = await apiClient.get('/templates', { params })
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get template by ID
  async getTemplateById(id) {
    try {
      const response = await apiClient.get(`/templates/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get default template
  async getDefaultTemplate() {
    try {
      const response = await apiClient.get('/templates/default')
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Create template
  async createTemplate(templateData) {
    try {
      const response = await apiClient.post('/templates', templateData)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Update template
  async updateTemplate(id, templateData) {
    try {
      const response = await apiClient.put(`/templates/${id}`, templateData)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Delete template
  async deleteTemplate(id) {
    try {
      const response = await apiClient.delete(`/templates/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Clone template
  async cloneTemplate(id, newTitle = null) {
    try {
      const params = {}
      if (newTitle) {
        params.new_title = newTitle
      }
      
      const response = await apiClient.post(`/templates/${id}/clone`, null, { params })
      return response.data
    } catch (error) {
      throw error
    }
  }
}

export default templateService