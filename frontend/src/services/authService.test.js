import authService from './authService';
import apiClient from './apiClient';

// Mock the API client
jest.mock('./apiClient');

describe('authService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('login', () => {
    test('should call the login endpoint with correct parameters', async () => {
      // Setup
      const mockResponse = { 
        data: { 
          access_token: 'mock-token',
          token_type: 'bearer'
        } 
      };
      apiClient.post.mockResolvedValue(mockResponse);
      
      const email = 'test@example.com';
      const password = 'password123';
      
      // Execute
      const result = await authService.login(email, password);
      
      // Verify
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login/json', { email, password });
      expect(result).toEqual(mockResponse.data);
    });
    
    test('should throw an error when API call fails', async () => {
      // Setup
      const mockError = new Error('Login failed');
      apiClient.post.mockRejectedValue(mockError);
      
      // Execute & Verify
      await expect(authService.login('test@example.com', 'password123'))
        .rejects.toThrow(mockError);
    });
  });
  
  describe('getCurrentUser', () => {
    test('should call the me endpoint', async () => {
      // Setup
      const mockResponse = { 
        data: { 
          id: '123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'admin'
        } 
      };
      apiClient.get.mockResolvedValue(mockResponse);
      
      // Execute
      const result = await authService.getCurrentUser();
      
      // Verify
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockResponse.data);
    });
  });
  
  describe('requestPasswordReset', () => {
    test('should call the reset-password endpoint with correct email', async () => {
      // Setup
      const mockResponse = { 
        data: { 
          message: 'If the email exists, a reset link will be sent.'
        } 
      };
      apiClient.post.mockResolvedValue(mockResponse);
      
      const email = 'test@example.com';
      
      // Execute
      const result = await authService.requestPasswordReset(email);
      
      // Verify
      expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password', { email });
      expect(result).toEqual(mockResponse.data);
    });
  });
  
  describe('resetPassword', () => {
    test('should call the reset-password/confirm endpoint with correct parameters', async () => {
      // Setup
      const mockResponse = { 
        data: { 
          success: true
        } 
      };
      apiClient.post.mockResolvedValue(mockResponse);
      
      const token = 'reset-token';
      const newPassword = 'new-password';
      
      // Execute
      const result = await authService.resetPassword(token, newPassword);
      
      // Verify
      expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password/confirm', {
        token,
        new_password: newPassword
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
});