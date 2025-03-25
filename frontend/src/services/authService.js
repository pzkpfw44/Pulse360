import apiClient from './apiClient'

const authService = {
  // User login
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login/json', {
        email,
        password
      })
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Get current user
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me')
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Request password reset
  async requestPasswordReset(email) {
    try {
      const response = await apiClient.post('/auth/reset-password', { email })
      return response.data
    } catch (error) {
      throw error
    }
  },
  
  // Reset password with token
  async resetPassword(token, newPassword) {
    try {
      const response = await apiClient.post('/auth/reset-password/confirm', {
        token,
        new_password: newPassword
      })
      return response.data
    } catch (error) {
      throw error
    }
  }
}

export default authService