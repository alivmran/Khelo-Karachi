const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Court = require('../models/Court');
const { protect, manager } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/emailService');

const parseHour = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return null;
  const [h, m] = timeString.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || m !== 0 || h < 0 || h > 24) return null;
  return h;
};

const isOutsideHours = (startHour, endHour, openHour, closeHour) => {
  if (closeHour <= openHour) {
    return !( (startHour >= openHour && endHour <= 24) || (startHour >= 0 && endHour <= closeHour) );
  }
  return startHour < openHour || endHour > closeHour;
};

router.get('/dashboard', protect, manager, async (req, res, next) => {
  try {
    const court = await Court.findOne({ manager: req.user._id });
    if (!court) return res.status(404).json({ message: 'No court assigned' });

    const bookings = await Booking.find({ court: court._id }).populate('user', 'name email').sort({ date: -1 });

    // Stats Calculation
    const totalBookings = bookings.length;
    const approvedBookings = bookings.filter(b => b.status === 'Approved' && b.type === 'Online');
    const totalRevenue = approvedBookings.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
    const pendingRequests = bookings.filter(b => b.status === 'Pending').length;

    res.json({
      courtName: court.name,
      courtId: court._id,
      court,
      stats: { totalBookings, activeBookings: approvedBookings.length, pendingRequests, totalRevenue },
      recentActivity: bookings.slice(0, 10), // Top 10 recent
      approvedBookings
    });
  } catch (error) {
    next(error);
  }
});
router.post('/block', protect, manager, async (req, res, next) => {
  try {
    const { date, facility, timeBlocks } = req.body;
    if (!facility) return res.status(400).json({ message: 'Facility is required' });
    const court = await Court.findOne({ manager: req.user._id });
    if (!court) return res.status(404).json({ message: 'No court assigned' });

    if (!timeBlocks || timeBlocks.length === 0) {
      return res.status(400).json({ message: 'No time slots provided' });
    }

    const createdBlocks = [];

    for (let block of timeBlocks) {
      const { startTime, endTime } = block;
      const openHour = parseHour(court.operationalStartTime || '00:00');
      const closeHour = parseHour(court.operationalEndTime || '24:00');
      const startHour = parseHour(startTime);
      const endHour = parseHour(endTime);
      if (startHour === null || endHour === null || endHour <= startHour) {
        return res.status(400).json({ message: 'Invalid time block' });
      }
      if (isOutsideHours(startHour, endHour, openHour, closeHour)) {
        return res.status(400).json({ message: 'Selected time is outside operational hours' });
      }

      const conflict = await Booking.findOne({
        court: court._id,
        facility,
        date,
        status: { $ne: 'Rejected' },
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
        ]
      });
      if (conflict) return res.status(400).json({ message: `Time slot ${startTime}-${endTime} is already booked` });

      const newBlock = new Booking({
        court: court._id,
        facility,
        date,
        startTime,
        endTime,
        status: 'Approved',
        type: 'ManualBlock'
      });
      await newBlock.save();
      createdBlocks.push(newBlock);
    }
    res.status(201).json(createdBlocks);
  } catch (error) {
    next(error);
  }
});

router.put('/booking/:id', protect, manager, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const court = await Court.findOne({ manager: req.user._id });
    if (!court) return res.status(404).json({ message: 'No court assigned' });

    const booking = await Booking.findOne({ _id: req.params.id, court: court._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = status === 'Rejected' ? 'Awaiting Refund Details' : status;
    await booking.save();

    const bookingUser = await require('../models/User').findById(booking.user);
    if (bookingUser) {
      const subject = status === 'Approved' ? 'Booking Approved' : 'Booking Rejected';
      const msgBody = status === 'Approved' ? 
        `Your booking at ${court.name} has been approved. Enjoy your game!` : 
        `Your booking at ${court.name} was rejected. Please log in and provide refund details.`;
      sendEmail(bookingUser.email, subject, subject, msgBody);
    }

    const Notification = require('../models/Notification');
    const notif = new Notification({
      recipient: booking.user,
      message: `Your booking for ${court.name} was ${status}.`,
      type: 'booking'
    });
    await notif.save();
    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    if (io && userSockets && userSockets.has(booking.user.toString())) {
      io.to(userSockets.get(booking.user.toString())).emit('newNotification', notif);
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
});

module.exports = router;