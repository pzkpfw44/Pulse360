const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['rating', 'open_ended', 'multiple_choice'], 
    default: 'rating' 
  },
  category: { type: String },
  required: { type: Boolean, default: true },
  order: { type: Number, required: true }
});

const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  documentType: { 
    type: String, 
    enum: ['leadership_model', 'job_description', 'competency_framework', 
           'company_values', 'performance_criteria'], 
    required: true 
  },
  generatedBy: { 
    type: String, 
    enum: ['flux_ai', 'manual'], 
    default: 'flux_ai' 
  },
  questions: [questionSchema],
  sourceDocuments: [{
    fluxAiFileId: { type: String },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
  }],
  status: { 
    type: String, 
    enum: ['pending_review', 'approved', 'archived'], 
    default: 'pending_review' 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Template', templateSchema);