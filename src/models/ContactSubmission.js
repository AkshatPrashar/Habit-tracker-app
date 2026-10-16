import mongoose from 'mongoose';

const contactSubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

contactSubmissionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('ContactSubmission', contactSubmissionSchema);
