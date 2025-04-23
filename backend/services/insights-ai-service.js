// backend/services/insights-ai-service.js

const axios = require('axios');
const { generateMockInsight } = require('../utils/mock-insight-generator');

/**
 * Service for AI-powered insights generation
 */
class InsightsAiService {
  constructor() {
    this.apiUrl = process.env.FLUX_AI_BASE_URL || 'https://ai.runonflux.com';
    this.apiKey = process.env.FLUX_AI_API_KEY;
    this.model = process.env.FLUX_AI_MODEL || 'DeepSeek R1 Distill Qwen 32B';
  }

  /**
   * Generate a Growth Blueprint insight using FluxAI
   * @param {Object} feedbackData - Aggregated feedback data
   * @param {Object} targetEmployee - Target employee data
   * @param {Object} campaign - Campaign data
   * @returns {Object} - Structured insight content
   */
  async generateGrowthBlueprint(feedbackData, targetEmployee, campaign) {
    try {
      console.log('Generating growth blueprint with FluxAI...');
      
      // ADDED: Detailed configuration logging
      console.log(`[FLUXAI] API Key present: ${!!this.apiKey}`);
      console.log(`[FLUXAI] Using API URL: ${this.apiUrl}/v1/chat/completions`);
      console.log(`[FLUXAI] Using model: ${this.model}`);
      
      // Check if we have necessary data and API key
      if (!targetEmployee) {
        console.error('Missing target employee data, using mock data');
        return generateMockInsight({ firstName: 'Employee', lastName: 'Name' });
      }
      
      if (!this.apiKey) {
        console.error('Missing FluxAI API key, using mock data');
        return generateMockInsight(targetEmployee);
      }
      
      // Format the employee name for use in prompts
      const employeeName = `${targetEmployee.firstName} ${targetEmployee.lastName}`;
      console.log(`Generating insights for employee: ${employeeName}`);
      
      // Prepare feedback data for the AI
      const feedbackSummary = this.prepareFeedbackForAI(feedbackData);
      
      // Create the endpoint URL - CORRECTED BASED ON DOCUMENTATION
      const apiUrl = `${this.apiUrl}/v1/chat/completions`;
      console.log(`Calling FluxAI at: ${apiUrl}`);
      
      // Create the prompt for the AI based on FluxAI documentation
      const messages = [
        {
          role: "system",
          content: `You are an expert HR analytics tool that generates personalized development insights from 360 feedback data. You analyze patterns in feedback and create structured growth blueprints that are actionable and specific.`
        },
        {
          role: "user",
          content: `Generate a comprehensive Growth Blueprint for ${employeeName} based on the following 360 feedback data. Structure your response as JSON with these sections:
          
          1. strengthsSummary: Key strengths identified in the feedback
          2. growthAreas: Areas that need development
          3. impactAnalysis: How the employee's behaviors impact others
          4. recommendedActions: Specific action items for growth
          5. feedbackPatterns: Patterns observed across different relationship types
          6. leadershipInsights: Insights for managers to support this employee
          7. talentDevelopmentNotes: Notes for HR and talent management
          
          For sections 1-4, use "employeeVisible" visibility. For 5-6, use "managerOnly". For 7, use "hrOnly".
          
          Each section in your JSON should have this structure:
          {
            "sectionName": {
              "content": "Detailed multi-paragraph text with specific insights",
              "visibility": "employeeVisible OR managerOnly OR hrOnly"
            }
          }
          
          Feedback data: ${JSON.stringify(feedbackSummary)}`
        }
      ];
      
      // ADDED: Log request details
      console.log(`[FLUXAI] Sending request with messages length: ${messages.length}`);
      console.log(`[FLUXAI] Request model: ${this.model}`);
      
      // API request based on FluxAI documentation
      const response = await axios.post(
        apiUrl,
        {
          messages: messages,
          model: this.model,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`FluxAI Response Status: ${response.status}`);
      console.log(`FluxAI Response Data Structure: ${Object.keys(response.data).join(', ')}`);
      
      // ADDED: Log raw response data (truncated to avoid huge logs)
      console.log(`[FLUXAI] Raw response data: ${JSON.stringify(response.data).substring(0, 500)}...`);
      
      // Process the response according to FluxAI documentation
      if (response.data && 
          response.data.choices && 
          response.data.choices.length > 0 && 
          response.data.choices[0].message && 
          response.data.choices[0].message.content) {
        
        try {
          // Try to parse the JSON response
          const rawContent = response.data.choices[0].message.content.trim();
          
          // ADDED: Log the raw content
          console.log(`[FLUXAI] Raw content from AI: ${rawContent.substring(0, 200)}...`);
          
          // Some AI models add markdown code blocks - clean those up
          const jsonContent = rawContent
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
          
          // Parse the cleaned JSON
          const parsedContent = JSON.parse(jsonContent);
          
          // Validate the content structure
          if (typeof parsedContent === 'object' && Object.keys(parsedContent).length > 0) {
            // Check if it has at least the basic required sections
            if (parsedContent.strengthsSummary && parsedContent.growthAreas) {
              console.log('[INSIGHTS] Successfully generated AI content with sections:', Object.keys(parsedContent).join(', '));
              return parsedContent;
            }
          }
          
          console.log('AI response was valid JSON but missing required sections, using mock data');
        } catch (parseError) {
          console.error('Error parsing AI JSON response:', parseError);
          console.log('AI response content format was invalid, using mock data');
        }
      } else {
        console.log('Invalid AI response structure, using mock data');
      }
      
      // If we reach here, the AI response couldn't be used, so return mock data
      return generateMockInsight(targetEmployee);
      
    } catch (error) {
      // ADDED: Enhanced error logging
      console.error('Error calling FluxAI API:', error.message);
      console.error(`[FLUXAI] API error details: ${error.response ? JSON.stringify(error.response.data) : 'No response data'}`);
      console.error(`[FLUXAI] Error stack: ${error.stack}`);
      
      // If there's a network error, log that specifically
      if (error.code) {
        console.error(`[FLUXAI] Network error code: ${error.code}`);
      }
      
      // Return mock data as fallback
      return generateMockInsight(targetEmployee);
    }
  }

  /**
   * Helper method to prepare feedback data for AI consumption
   * @param {Object} feedbackData - Raw feedback data
   * @returns {Object} - Simplified feedback summary
   */
  prepareFeedbackForAI(feedbackData) {
    try {
      // Create a simplified representation of feedback data for the AI
      const summary = {
        relationshipTypes: {},
        categories: {},
        questions: {},
        completedCount: {}
      };
      
      // Extract relationship data
      if (feedbackData.byRelationshipType) {
        Object.entries(feedbackData.byRelationshipType).forEach(([type, data]) => {
          // Get ratings
          const ratings = {};
          if (data.ratings) {
            Object.entries(data.ratings).forEach(([questionId, ratingData]) => {
              ratings[questionId] = {
                average: ratingData.average || 0,
                count: ratingData.count || 0
              };
            });
          }
          
          // Get text responses
          const textResponses = {};
          if (data.textResponses) {
            Object.entries(data.textResponses).forEach(([questionId, responses]) => {
              textResponses[questionId] = responses || [];
            });
          }
          
          summary.relationshipTypes[type] = {
            ratings,
            textResponses,
            count: data.count || 0
          };
        });
      }
      
      // Add participant counts
      if (feedbackData.completedParticipantsByType) {
        summary.completedCount = feedbackData.completedParticipantsByType;
      }
      
      // Add question data for context
      if (feedbackData.byQuestion) {
        Object.entries(feedbackData.byQuestion).forEach(([questionId, data]) => {
          summary.questions[questionId] = {
            text: data.text || '',
            type: data.type || '',
            category: data.category || ''
          };
        });
      }
      
      // Add category data
      if (feedbackData.byCategory) {
        Object.entries(feedbackData.byCategory).forEach(([category, data]) => {
          const categoryRatings = {};
          
          if (data.ratings) {
            Object.entries(data.ratings).forEach(([questionId, ratingData]) => {
              categoryRatings[questionId] = {
                average: ratingData.average || 0,
                count: ratingData.count || 0
              };
            });
          }
          
          summary.categories[category] = categoryRatings;
        });
      }
      
      return summary;
    } catch (error) {
      console.error('Error preparing feedback for AI:', error);
      return { error: 'Failed to prepare feedback data' };
    }
  }
}

module.exports = new InsightsAiService();