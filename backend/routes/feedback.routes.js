// backend/routes/feedback.routes.js

const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');

// Route for evaluating feedback with AI
router.post('/evaluate', feedbackController.evaluateFeedback);

// Route for submitting feedback
router.post('/submit', feedbackController.submitFeedback);

// NEW ROUTE: Get assessment data by token
router.get('/assessment/:token', feedbackController.getAssessmentByToken);

// NEW ROUTE: Save draft feedback
router.post('/save-draft', feedbackController.saveFeedbackDraft);

module.exports = router;