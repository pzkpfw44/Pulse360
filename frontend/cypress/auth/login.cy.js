/// <reference types="cypress" />

describe('Login Flow', () => {
    beforeEach(() => {
      // Visit the login page before each test
      cy.visit('/login');
    });
    
    it('displays the login form', () => {
      // Verify login page elements
      cy.get('form').should('be.visible');
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });
    
    it('shows validation errors for empty fields', () => {
      // Click submit without filling form
      cy.get('button[type="submit"]').click();
      
      // Check that validation errors appear
      cy.contains('Email is required').should('be.visible');
      cy.contains('Password is required').should('be.visible');
    });
    
    it('shows error for invalid credentials', () => {
      // Intercept the login request
      cy.intercept('POST', '/api/auth/login/json', {
        statusCode: 401,
        body: {
          detail: 'Incorrect email or password'
        }
      }).as('loginRequest');
      
      // Fill form with invalid credentials
      cy.get('input[name="email"]').type('wrong@example.com');
      cy.get('input[name="password"]').type('wrongpassword');
      
      // Submit the form
      cy.get('button[type="submit"]').click();
      
      // Wait for the request to complete
      cy.wait('@loginRequest');
      
      // Check for error toast
      cy.contains('Incorrect email or password').should('be.visible');
    });
    
    it('redirects to dashboard after successful login', () => {
      // Intercept the login request
      cy.intercept('POST', '/api/auth/login/json', {
        statusCode: 200,
        body: {
          access_token: 'fake-jwt-token',
          token_type: 'bearer'
        }
      }).as('loginRequest');
      
      // Intercept the user info request
      cy.intercept('GET', '/api/auth/me', {
        statusCode: 200,
        body: {
          id: '123',
          email: 'admin@example.com',
          full_name: 'Admin User',
          role: 'admin'
        }
      }).as('userRequest');
      
      // Fill form with valid credentials
      cy.get('input[name="email"]').type('admin@example.com');
      cy.get('input[name="password"]').type('password');
      
      // Submit the form
      cy.get('button[type="submit"]').click();
      
      // Wait for the requests to complete
      cy.wait('@loginRequest');
      cy.wait('@userRequest');
      
      // Verify redirect to dashboard
      cy.url().should('include', '/');
      cy.contains('Welcome, Admin User').should('be.visible');
    });
    
    it('remembers user when "Remember me" is checked', () => {
      // Intercept the login request
      cy.intercept('POST', '/api/auth/login/json', {
        statusCode: 200,
        body: {
          access_token: 'fake-jwt-token',
          token_type: 'bearer'
        }
      }).as('loginRequest');
      
      // Fill form with valid credentials
      cy.get('input[name="email"]').type('admin@example.com');
      cy.get('input[name="password"]').type('password');
      
      // Check "Remember me"
      cy.get('input[name="remember-me"]').check();
      
      // Submit the form
      cy.get('button[type="submit"]').click();
      
      // Wait for the login request
      cy.wait('@loginRequest');
      
      // Verify that the token is stored in localStorage
      cy.window().then((window) => {
        expect(window.localStorage.getItem('accessToken')).to.eq('fake-jwt-token');
      });
    });
  });