import mongoose from 'mongoose';

const passwordAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// TTL: auto-delete records 1 day after last update, so an inactive
// user's record cleans itself up.
passwordAttemptSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.model('PasswordAttempt', passwordAttemptSchema);
