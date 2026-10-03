import Habit from '../models/Habit.js';
import CalendarDay from '../models/CalendarDay.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseDateStr = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
};

const toUTCTimestamp = (dateStr) => {
  const { y, m, d } = parseDateStr(dateStr);
  return Date.UTC(y, m - 1, d);
};

const formatUTCTimestamp = (ts) => {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const previousDateStr = (dateStr) => formatUTCTimestamp(toUTCTimestamp(dateStr) - 24 * 60 * 60 * 1000);

const checkedInDates = (history) =>
  Object.keys(history || {})
    .filter((date) => (history[date] || 0) >= 1)
    .sort();

const computeCurrentStreak = (history) => {
  const dates = checkedInDates(history);
  if (dates.length === 0) return 0;

  const checkedSet = new Set(dates);
  const anchor = dates[dates.length - 1];

  let streak = 1;
  let cursor = previousDateStr(anchor);
  while (checkedSet.has(cursor)) {
    streak += 1;
    cursor = previousDateStr(cursor);
  }
  return streak;
};

const computeLongestRun = (history) => {
  const dates = checkedInDates(history);
  if (dates.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < dates.length; i++) {
    if (previousDateStr(dates[i]) === dates[i - 1]) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
  }
  return longest;
};

export const getHabits = asyncHandler(async (req, res) => {
  const habits = await Habit.find({ userId: req.user._id }).sort({ createdAt: 1 });
  const calendarDays = await CalendarDay.find({ userId: req.user._id });

  const calendarData = {};
  calendarDays.forEach((day) => {
    calendarData[day.date] = {
      tasks: day.tasks,
      notes: day.notes,
      timeBlocks: day.timeBlocks,
    };
  });

  res.status(200).json(new ApiResponse(200, { habits, calendarData }, 'Habits fetched successfully'));
});

export const createHabit = asyncHandler(async (req, res) => {
  const { id, name, type, color, startDate } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw new ApiError(400, 'name is required');
  }
  if (!startDate || typeof startDate !== 'string' || !DATE_RE.test(startDate)) {
    throw new ApiError(400, 'startDate (YYYY-MM-DD) is required');
  }

  const habit = await Habit.create({
    userId: req.user._id,
    id: typeof id === 'string' ? id : undefined,
    name: name.trim(),
    type: type || 'habit',
    color,
    startDate,
  });

  res.status(201).json(new ApiResponse(201, { habit }, 'Habit created successfully'));
});

const FORBIDDEN_PATCH_FIELDS = ['history', 'currentStreak', 'longestStreak', 'lastCheckedDate'];
const ALLOWED_PATCH_FIELDS = ['name', 'type', 'color', 'pending'];

export const updateHabit = asyncHandler(async (req, res) => {
  const { habitId } = req.params;
  const body = req.body || {};

  const sentForbidden = FORBIDDEN_PATCH_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(body, field));
  if (sentForbidden.length > 0) {
    throw new ApiError(400, `Cannot set ${sentForbidden.join(', ')} via PATCH /api/habits/:habitId. Use the check-in endpoints instead.`);
  }

  const unknownFields = Object.keys(body).filter((field) => !ALLOWED_PATCH_FIELDS.includes(field));
  if (unknownFields.length > 0) {
    throw new ApiError(400, `Unknown field(s): ${unknownFields.join(', ')}`);
  }

  const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
  if (!habit) {
    throw new ApiError(404, 'Habit not found');
  }

  ALLOWED_PATCH_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      habit[field] = body[field];
    }
  });

  await habit.save();

  res.status(200).json(new ApiResponse(200, { habit }, 'Habit updated successfully'));
});

export const deleteHabit = asyncHandler(async (req, res) => {
  const { habitId } = req.params;

  const habit = await Habit.findOneAndDelete({ _id: habitId, userId: req.user._id });
  if (!habit) {
    throw new ApiError(404, 'Habit not found');
  }

  res.status(200).json(new ApiResponse(200, null, 'Habit deleted successfully'));
});

export const checkIn = asyncHandler(async (req, res) => {
  const { habitId } = req.params;
  const { date, value, questionDataValue } = req.body || {};

  if (!date || typeof date !== 'string' || !DATE_RE.test(date)) {
    throw new ApiError(400, 'A valid date (YYYY-MM-DD) is required');
  }

  const checkInValue = value === undefined ? 1 : value;
  if (typeof checkInValue !== 'number') {
    throw new ApiError(400, 'value must be a number');
  }

  if (questionDataValue !== undefined && typeof questionDataValue !== 'number') {
    throw new ApiError(400, 'questionDataValue must be a number');
  }

  // Step 1: load habit
  const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
  if (!habit) {
    throw new ApiError(404, 'Habit not found');
  }

  // Step 2: merge the new entry into LOCAL copies only — habit is not mutated yet
  const nextHistory = { ...(habit.history || {}), [date]: checkInValue };
  const nextQuestionData =
    questionDataValue === undefined
      ? habit.questionData || {}
      : { ...(habit.questionData || {}), [date]: questionDataValue };

  // Step 3: compute streaks from the local copy (questionData never feeds streak math)
  const nextCurrentStreak = computeCurrentStreak(nextHistory);
  const nextLongestRun = computeLongestRun(nextHistory);
  const checkedDates = checkedInDates(nextHistory);
  const nextLastCheckedDate = checkedDates.length > 0 ? checkedDates[checkedDates.length - 1] : null;

  // Step 4: assign all fields back to the document together
  habit.history = nextHistory;
  habit.currentStreak = nextCurrentStreak;
  habit.longestStreak = Math.max(habit.longestStreak || 0, nextLongestRun);
  habit.lastCheckedDate = nextLastCheckedDate;
  if (questionDataValue !== undefined) {
    habit.questionData = nextQuestionData;
  }

  // Step 5: mark Mixed paths modified
  habit.markModified('history');
  if (questionDataValue !== undefined) {
    habit.markModified('questionData');
  }

  // Step 6: single save
  await habit.save();

  res.status(200).json(new ApiResponse(200, { habit }, 'Check-in recorded'));
});

export const deleteCheckIn = asyncHandler(async (req, res) => {
  const { habitId, date } = req.params;

  if (!date || !DATE_RE.test(date)) {
    throw new ApiError(400, 'A valid date (YYYY-MM-DD) is required');
  }

  const habit = await Habit.findOne({ _id: habitId, userId: req.user._id });
  if (!habit) {
    throw new ApiError(404, 'Habit not found');
  }

  const history = { ...(habit.history || {}) };
  delete history[date];

  const remainingDates = checkedInDates(history);

  habit.history = history;
  habit.currentStreak = computeCurrentStreak(history);
  habit.lastCheckedDate = remainingDates.length > 0 ? remainingDates[remainingDates.length - 1] : null;
  // longestStreak intentionally left unchanged — monotonic high-water mark, never decreases
  habit.markModified('history');

  await habit.save();

  res.status(200).json(new ApiResponse(200, { habit }, 'Check-in removed'));
});

export const getCalendarDay = asyncHandler(async (req, res) => {
  const { date } = req.params;
  if (!DATE_RE.test(date)) {
    throw new ApiError(400, 'date must be in YYYY-MM-DD format');
  }

  const day = await CalendarDay.findOne({ userId: req.user._id, date });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        date,
        tasks: day?.tasks || [],
        notes: day?.notes || '',
        timeBlocks: day?.timeBlocks || [],
      },
      'Calendar day fetched successfully'
    )
  );
});

export const putCalendarDay = asyncHandler(async (req, res) => {
  const { date } = req.params;
  if (!DATE_RE.test(date)) {
    throw new ApiError(400, 'date must be in YYYY-MM-DD format');
  }

  const { tasks, notes, timeBlocks } = req.body || {};

  if (tasks !== undefined && !Array.isArray(tasks)) {
    throw new ApiError(400, 'tasks must be an array');
  }
  if (notes !== undefined && typeof notes !== 'string') {
    throw new ApiError(400, 'notes must be a string');
  }
  if (timeBlocks !== undefined && !Array.isArray(timeBlocks)) {
    throw new ApiError(400, 'timeBlocks must be an array');
  }

  const update = {
    ...(tasks !== undefined ? { tasks } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(timeBlocks !== undefined ? { timeBlocks } : {}),
  };

  const day = await CalendarDay.findOneAndUpdate(
    { userId: req.user._id, date },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.status(200).json(
    new ApiResponse(
      200,
      { date, tasks: day.tasks, notes: day.notes, timeBlocks: day.timeBlocks },
      'Calendar day saved successfully'
    )
  );
});
