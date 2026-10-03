import mongoose from 'mongoose';

const calendarDaySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    tasks: {
      type: [
        {
          text: { type: String, required: true },
          done: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    notes: {
      type: String,
      default: '',
    },
    timeBlocks: {
      type: [
        {
          id: { type: String, required: true },
          title: { type: String, required: true },
          startTime: { type: String, required: true },
          endTime: { type: String, required: true },
          completed: { type: Boolean, default: false },
          plannedDuration: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

calendarDaySchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('CalendarDay', calendarDaySchema);
