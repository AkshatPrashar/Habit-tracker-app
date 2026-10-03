import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    id: {
      type: String,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      default: 'habit',
    },
    color: {
      type: String,
    },
    startDate: {
      type: String,
      required: true,
    },
    history: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    questionData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastCheckedDate: {
      type: String,
      default: null,
    },
    pending: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Habit', habitSchema);
