const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    category: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    businessName: { type: String },
    repoUrl: { type: String },
    liveUrl: { type: String },
    html: { type: String }, // final generated single-file source, kept for ZIP/edit
    status: {
      type: String,
      enum: [
        'queued',
        'classifying',
        'writing_content',
        'validating',
        'committing',
        'deploying',
        'deployed',
        'failed'
      ],
      default: 'queued'
    },
    error: { type: String },
    steps: [
      {
        label: String,
        status: { type: String, enum: ['pending', 'active', 'done', 'failed'] },
        at: Date
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
