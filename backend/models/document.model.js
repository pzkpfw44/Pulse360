const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
  path: { type: String, required: true },
  documentType: { 
    type: String, 
    enum: ['leadership_model', 'job_description', 'competency_framework', 
           'company_values', 'performance_criteria'], 
    required: true 
  },
  fluxAiFileId: { type: String },
  status: { 
    type: String, 
    enum: ['uploaded', 'uploaded_to_ai', 'analysis_in_progress', 
           'analysis_complete', 'analysis_failed'], 
    default: 'uploaded' 
  },
  analysisError: { type: String },
  associatedTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Template' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);