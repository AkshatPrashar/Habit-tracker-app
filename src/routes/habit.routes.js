import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  checkIn,
  deleteCheckIn,
  getCalendarDay,
  putCalendarDay,
} from '../controllers/habit.controller.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', getHabits);
router.post('/', createHabit);

router.get('/calendar/:date', getCalendarDay);
router.put('/calendar/:date', putCalendarDay);

router.post('/:habitId/checkin', checkIn);
router.delete('/:habitId/checkin/:date', deleteCheckIn);

router.patch('/:habitId', updateHabit);
router.delete('/:habitId', deleteHabit);

export default router;
