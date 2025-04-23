// backend/scripts/insert-mock-insight.js
const { Insight } = require('../models');

async function insertMockContent() {
  try {
    // Get the insight ID from command line argument
    const insightId = process.argv[2];
    if (!insightId) {
      console.error('Please provide an insight ID as an argument');
      process.exit(1);
    }

    console.log(`Adding mock content to insight: ${insightId}`);
    
    // Find the insight
    const insight = await Insight.findByPk(insightId);
    if (!insight) {
      console.error('Insight not found');
      process.exit(1);
    }
    
    // Create mock content directly
    const mockContent = {
      "strengthsSummary": {
        "content": "Based on feedback data, Subject Voj demonstrates several key strengths. They are well-regarded for their technical expertise, problem-solving abilities, and dedication to quality work.",
        "visibility": "employeeVisible"
      },
      "growthAreas": {
        "content": "Areas for potential development include enhancing communication skills, particularly when explaining complex concepts to non-technical team members.",
        "visibility": "employeeVisible"
      },
      "impactAnalysis": {
        "content": "Subject Voj has made notable contributions in several key projects. Their technical solutions have directly impacted efficiency and quality.",
        "visibility": "employeeVisible"
      },
      "recommendedActions": {
        "content": "1. Consider participating in communication skills training\n2. Work with a mentor on developing time management techniques\n3. Seek opportunities to lead cross-functional initiatives",
        "visibility": "employeeVisible"
      },
      "feedbackPatterns": {
        "content": "Consistent patterns in the feedback indicate strong technical abilities coupled with opportunities to enhance soft skills.",
        "visibility": "managerOnly"
      },
      "leadershipInsights": {
        "content": "When supporting Subject Voj's development, focus on providing opportunities that combine technical excellence with increased collaboration.",
        "visibility": "managerOnly"
      },
      "talentDevelopmentNotes": {
        "content": "Subject Voj represents valuable technical talent with potential for growth into technical leadership roles.",
        "visibility": "hrOnly"
      }
    };

    // Update the insight
    await insight.update({
      content: mockContent
    });

    console.log('Mock content added successfully');
    console.log(JSON.stringify(insight.content, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

insertMockContent();