// backend/services/insights-ai-service.js

const axios = require('axios');
const fluxAiConfig = require('../config/flux-ai');

/**
 * Service for generating insights using FluxAI
 */
class InsightsAiService {
  /**
   * Generate a growth blueprint report for an individual
   * @param {Object} feedbackData - Aggregated feedback data for the individual
   * @param {Object} employeeData - Employee information
   * @param {Object} campaignData - Campaign information
   * @returns {Object} Generated report content
   */
  async generateGrowthBlueprint(feedbackData, employeeData, campaignData) {
    try {
      console.log('Generating growth blueprint with FluxAI...');
      
      // Prepare the prompt for the AI
      const prompt = this.buildGrowthBlueprintPrompt(feedbackData, employeeData, campaignData);
      
      // Call Flux AI
      const response = await axios.post(fluxAiConfig.getEndpointUrl('chat/completions'), {
        model: fluxAiConfig.model,
        messages: [
          { role: "system", content: "You are an expert HR consultant specializing in talent development and 360-degree feedback analysis. Your task is to analyze feedback data and generate a comprehensive individual development report." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }, {
        headers: {
          'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Process the AI response
      const aiContent = response.data.choices[0].message.content;
      
      // Parse the content into structured sections
      return this.parseAiResponseToReportSections(aiContent);
      
    } catch (error) {
      console.error('Error generating growth blueprint with AI:', error);
      
      // Return a fallback report if AI generation fails
      return this.generateFallbackGrowthBlueprint(feedbackData, employeeData);
    }
  }
  
  /**
   * Build the prompt for growth blueprint generation
   * @param {Object} feedbackData - Aggregated feedback data
   * @param {Object} employeeData - Employee information
   * @param {Object} campaignData - Campaign information
   * @returns {String} Formatted prompt
   */
  buildGrowthBlueprintPrompt(feedbackData, employeeData, campaignData) {
    return `
    ## Task: Generate a "Your Growth Blueprint" report for ${employeeData.firstName} ${employeeData.lastName}

    ## Employee Information:
    - Name: ${employeeData.firstName} ${employeeData.lastName}
    - Position: ${employeeData.jobTitle || 'Not specified'}
    - Department: ${employeeData.department || 'Not specified'}
    
    ## Feedback Data:
    ${JSON.stringify(feedbackData, null, 2)}
    
    ## Report Structure:
    Create a comprehensive development report with the following sections:
    
    1. EXECUTIVE SUMMARY (employeeVisible)
    - Brief overview of key strengths and development areas
    - 3-5 bullet points highlighting main insights
    
    2. STRENGTHS ASSESSMENT (employeeVisible)
    - 3-5 key strengths identified from feedback
    - Specific examples and impact of these strengths
    - How to leverage these strengths further
    
    3. DEVELOPMENT OPPORTUNITIES (employeeVisible)
    - 3-5 key areas for development
    - Specific examples from feedback
    - Impact of these development areas on performance
    
    4. RECOMMENDED ACTIONS (employeeVisible)
    - Specific, actionable development recommendations
    - Learning resources and activities
    - Timeline suggestions for development
    
    5. BLIND SPOTS ANALYSIS (managerOnly)
    - Areas where self-perception differs from others' perception
    - Potential underlying causes
    - Coaching suggestions for managers
    
    6. CAREER DEVELOPMENT INSIGHTS (managerOnly)
    - Potential career paths based on strengths
    - Skills needed for advancement
    - Recommended experiences and exposure
    
    7. TALENT MANAGEMENT IMPLICATIONS (hrOnly)
    - Flight risk assessment
    - Succession planning considerations
    - Long-term development investment recommendations
    
    For each section, provide practical, specific insights based on the feedback data. Use a professional, constructive tone throughout.
    
    Format the response as JSON with the following structure:
    {
      "executiveSummary": { "content": "...", "visibility": "employeeVisible" },
      "strengthsAssessment": { "content": "...", "visibility": "employeeVisible" },
      "developmentOpportunities": { "content": "...", "visibility": "employeeVisible" },
      "recommendedActions": { "content": "...", "visibility": "employeeVisible" },
      "blindSpotsAnalysis": { "content": "...", "visibility": "managerOnly" },
      "careerDevelopmentInsights": { "content": "...", "visibility": "managerOnly" },
      "talentManagementImplications": { "content": "...", "visibility": "hrOnly" }
    }`;
  }
  
  /**
   * Parse AI response into structured report sections
   * @param {String} aiContent - Raw AI response
   * @returns {Object} Structured report content
   */
  parseAiResponseToReportSections(aiContent) {
    try {
      // Extract JSON from response (in case there's additional text)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, try to parse the entire response
      return JSON.parse(aiContent);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      
      // If parsing fails, create a structured format manually
      return {
        executiveSummary: { 
          content: "Failed to parse AI-generated content properly. Please regenerate the report.", 
          visibility: "employeeVisible" 
        }
      };
    }
  }
  
  /**
   * Generate a fallback report if AI generation fails
   * @param {Object} feedbackData - Aggregated feedback data
   * @param {Object} employeeData - Employee information
   * @returns {Object} Basic fallback report content
   */
  generateFallbackGrowthBlueprint(feedbackData, employeeData) {
    return {
      executiveSummary: {
        content: `Development report for ${employeeData.firstName} ${employeeData.lastName}. This is a fallback report generated due to an issue with AI content generation. The system has preserved the feedback data and you can try regenerating the report.`,
        visibility: "employeeVisible"
      },
      strengthsAssessment: {
        content: "Strengths assessment could not be generated. Please try regenerating the report.",
        visibility: "employeeVisible"
      },
      developmentOpportunities: {
        content: "Development opportunities could not be generated. Please try regenerating the report.",
        visibility: "employeeVisible"
      },
      recommendedActions: {
        content: "Recommended actions could not be generated. Please try regenerating the report.",
        visibility: "employeeVisible"
      },
      blindSpotsAnalysis: {
        content: "Blind spots analysis could not be generated. Please try regenerating the report.",
        visibility: "managerOnly"
      },
      careerDevelopmentInsights: {
        content: "Career development insights could not be generated. Please try regenerating the report.",
        visibility: "managerOnly"
      },
      talentManagementImplications: {
        content: "Talent management implications could not be generated. Please try regenerating the report.",
        visibility: "hrOnly"
      }
    };
  }
}

module.exports = new InsightsAiService();