import apiClient from './apiClient'

const documentService = {
  // Get all documents
  async getAllDocuments(query = '', tags = [], limit = 50, offset = 0) {
    try {
      const params = { limit, offset }
      
      if (query) {
        params.query = query
      }
      
      if (tags && tags.length > 0) {
        params.tags = tags
      }
      
      const response = await apiClient.get('/documents', { params })
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get document by ID
  async getDocumentById(id) {
    try {
      const response = await apiClient.get(`/documents/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Upload document
  async uploadDocument(file, title, description, tags) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)
      
      if (description) {
        formData.append('description', description)
      }
      
      if (tags && tags.length > 0) {
        formData.append('tags', tags.join(','))
      }
      
      const response = await apiClient.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Update document metadata
  async updateDocument(id, title, description, tags) {
    try {
      const response = await apiClient.put(`/documents/${id}`, {
        title,
        description,
        tags
      })
      
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Delete document
  async deleteDocument(id) {
    try {
      const response = await apiClient.delete(`/documents/${id}`)
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get all document tags
  async getAllTags() {
    try {
      const response = await apiClient.get('/documents/tags')
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get document download URL
  getDocumentDownloadUrl(id) {
    return `${apiClient.defaults.baseURL}/documents/${id}/download`
  }
}

export default documentService