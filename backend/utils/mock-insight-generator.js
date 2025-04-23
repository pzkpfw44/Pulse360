// backend/utils/mock-insight-generator.js

/**
 * Generates mock insight content for testing when AI fails
 * @param {Object} employeeData - Employee information
 * @returns {Object} Mock insight content
 */
function generateMockInsight(employeeData) {
    const employeeName = employeeData ? 
      `${employeeData.firstName} ${employeeData.lastName}` : 
      'the employee';
  
    return {
      executiveSummary: {
        content: `Executive Summary for ${employeeName}\n\n${employeeName} demonstrates strong technical skills and collaboration abilities. They're particularly effective at problem-solving and communication. Areas for development include strategic thinking and time management.`,
        visibility: "employeeVisible"
      },
      strengthsAssessment: {
        content: `Strengths Assessment\n\n1. Technical Expertise: ${employeeName} consistently demonstrates deep knowledge in their domain.\n\n2. Collaboration: Team members highlight their ability to work effectively with others.\n\n3. Communication: Clear and concise communication is a hallmark of their work style.`,
        visibility: "employeeVisible"
      },
      developmentOpportunities: {
        content: `Development Opportunities\n\n1. Strategic Thinking: ${employeeName} could benefit from developing a more long-term perspective.\n\n2. Time Management: Feedback suggests improving prioritization of tasks.\n\n3. Leadership Skills: Taking more initiative in team settings would be beneficial.`,
        visibility: "employeeVisible"
      },
      recommendedActions: {
        content: `Recommended Actions\n\n1. Attend a strategic planning workshop to enhance big-picture thinking.\n\n2. Implement a time-blocking system for better task management.\n\n3. Seek opportunities to lead small team projects or initiatives.`,
        visibility: "employeeVisible"
      },
      blindSpotsAnalysis: {
        content: `Blind Spots Analysis\n\n${employeeName} may not realize how their attention to detail sometimes leads to perfectionism. There's a disconnect between their self-assessment of delegation skills and how others perceive this area.`,
        visibility: "managerOnly"
      },
      careerDevelopmentInsights: {
        content: `Career Development Insights\n\n${employeeName}'s skills align well with a path toward technical leadership roles. Consider mentoring opportunities to develop their leadership capabilities while leveraging their strong technical foundation.`,
        visibility: "managerOnly"
      },
      talentManagementImplications: {
        content: `Talent Management Implications\n\n${employeeName} represents a valuable talent asset with high retention priority. Their unique combination of technical and collaborative skills would be difficult to replace. Flight risk appears moderate based on feedback patterns.`,
        visibility: "hrOnly"
      }
    };
  }
  
  module.exports = { generateMockInsight };