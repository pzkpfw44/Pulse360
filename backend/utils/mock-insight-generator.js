// backend/utils/mock-insight-generator.js

/**
 * Generate mock insight content for testing and fallback purposes
 * @param {object} employee - Target employee data
 * @returns {object} Structured insight content
 */
const generateMockInsight = (employee) => {
  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'the employee';
  
  return {
    strengthsSummary: {
      content: `Based on the feedback data, ${employeeName} demonstrates several key strengths. They are well-regarded for their technical expertise, problem-solving abilities, and dedication to quality work. Colleagues particularly appreciate their willingness to help others and their ability to remain calm under pressure.`,
      visibility: 'employeeVisible'
    },
    growthAreas: {
      content: `Areas for potential development include enhancing communication skills, particularly when explaining complex concepts to non-technical team members. There may also be opportunities to improve time management and delegation to increase overall effectiveness.`,
      visibility: 'employeeVisible'
    },
    impactAnalysis: {
      content: `${employeeName} has made notable contributions in several key projects. Their technical solutions have directly impacted efficiency and quality. Team members value their collaborative approach and technical mentorship.`,
      visibility: 'employeeVisible'
    },
    recommendedActions: {
      content: `1. Consider participating in communication skills training to enhance the ability to explain technical concepts\n2. Work with a mentor on developing strategic time management techniques\n3. Seek opportunities to lead cross-functional initiatives to broaden perspective\n4. Schedule regular feedback sessions with team members to maintain awareness of impact`,
      visibility: 'employeeVisible'
    },
    feedbackPatterns: {
      content: `Consistent patterns in the feedback indicate strong technical abilities coupled with opportunities to enhance soft skills. There is alignment between self-assessment and peer feedback regarding technical strengths, with manager feedback highlighting potential for greater leadership development.`,
      visibility: 'managerOnly'
    },
    leadershipInsights: {
      content: `When supporting ${employeeName}'s development, focus on providing opportunities that combine technical excellence with increased cross-functional collaboration. Consider pairing technical projects with communication-focused objectives to create balanced growth.`,
      visibility: 'managerOnly'
    },
    talentDevelopmentNotes: {
      content: `${employeeName} represents valuable technical talent with potential for growth into technical leadership roles. Consider for high-visibility projects that require both technical depth and stakeholder management to develop a broader skill set.`,
      visibility: 'hrOnly'
    }
  };
};

module.exports = { generateMockInsight };