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
      const response = await axios.post(
        `${fluxAiConfig.baseUrl}/v1/chat/completions`, // Fixed URL construction
        {
          model: fluxAiConfig.model,
          messages: [
            { role: "system", content: "You are an expert HR consultant specializing in talent development and 360-degree feedback analysis. Your task is to analyze feedback data and generate a comprehensive individual development report." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        }, 
        {
          headers: {
            'Authorization': `Bearer ${fluxAiConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
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
        content: "Based on the feedback data, the employee appears to have strengths in specific technical areas. However, due to system limitations, a detailed analysis couldn't be generated at this time. Please try regenerating the report.",
        visibility: "employeeVisible"
      },
      developmentOpportunities: {
        content: "There are several areas for potential growth and development. The system has identified these from the feedback data but couldn't generate a detailed analysis. Please try regenerating the report for more specific insights.",
        visibility: "employeeVisible"
      },
      recommendedActions: {
        content: "We recommend focusing on key development areas highlighted in the feedback. For more specific recommendations, please try regenerating the report when the system is fully available.",
        visibility: "employeeVisible"
      },
      blindSpotsAnalysis: {
        content: "Blind spots analysis requires comparing self-perception with feedback from others. The system has the data but couldn't generate a detailed analysis at this time. Please try again later.",
        visibility: "managerOnly"
      },
      careerDevelopmentInsights: {
        content: "Based on the employee's strengths and development areas, there are potential career paths to explore. For detailed insights, please regenerate this report when the system is fully available.",
        visibility: "managerOnly"
      },
      talentManagementImplications: {
        content: "This employee shows potential in specific areas that align with organizational needs. For a more comprehensive talent management analysis, please try regenerating this report.",
        visibility: "hrOnly"
      }
    };
  }
}

module.exports = new InsightsAiService();