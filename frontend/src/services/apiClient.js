import axios from 'axios'
import { toast } from 'react-toastify'

// Create axios instance with base URL from environment
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
})

// Add a request interceptor to inject authorization token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add a response interceptor to handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error
    
    // Handle different error statuses
    if (response) {
      switch (response.status) {
        case 401: // Unauthorized
          // If not on login page, redirect to login
          if (window.location.pathname !== '/login') {
            localStorage.removeItem('accessToken')
            window.location.href = '/login'
            toast.error('Session expired. Please log in again.')
          }
          break
          
        case 403: // Forbidden
          toast.error('You do not have permission to perform this action.')
          break
          
        case 404: // Not Found
          // Only show toast for API resource not found, not page not found
          if (response.config.url) {
            toast.error('The requested resource was not found.')
          }
          break
          
        case 422: // Validation Error
          if (response.data && response.data.detail) {
            toast.error(response.data.detail)
          } else {
            toast.error('Validation error. Please check your input.')
          }
          break
          
        case 500: // Server Error
        case 502: // Bad Gateway
        case 503: // Service Unavailable
          toast.error('Server error. Please try again later.')
          break
          
        default:
          if (response.data && response.data.detail) {
            toast.error(response.data.detail)
          } else {
            toast.error('An error occurred. Please try again.')
          }
      }
    } else {
      // Network error or other issues
      toast.error('Network error. Please check your connection.')
    }
    
    return Promise.reject(error)
  }
)

export default apiClient