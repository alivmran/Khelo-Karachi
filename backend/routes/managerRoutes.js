const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Court = require('../models/Court');
const { protect, manager } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');
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
    const { status, requireRefund } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const court = await Court.findOne({ manager: req.user._id });
    if (!court) return res.status(404).json({ message: 'No court assigned' });

    const booking = await Booking.findOne({ _id: req.params.id, court: court._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (status === 'Rejected') {
      if (requireRefund === false) {
        booking.status = 'Rejected';
        booking.disputeReason = 'Rejected due to invalid or incorrect payment screenshot.';
      } else {
        booking.status = 'Awaiting Refund Details';
      }
    } else {
      booking.status = status;
    }
    await booking.save();

    const bookingUser = await require('../models/User').findById(booking.user);
    if (bookingUser) {
      const subject = status === 'Approved' ? 'Booking Approved' : 'Booking Rejected';
      const msgBody = status === 'Approved' ? 
        `Your booking at ${court.name} has been approved. Enjoy your game!` : 
        (requireRefund === false ?
          `Your booking at ${court.name} was rejected due to an invalid/incorrect payment screenshot. No refund workflow applies.` :
          `Your booking at ${court.name} was rejected. Please log in and provide refund details.`);
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

router.put('/update-pricing', protect, manager, async (req, res, next) => {
  try {
    const court = await Court.findOne({ manager: req.user._id });
    if (!court) return res.status(404).json({ message: 'No court assigned' });

    const { discountPercentage, discountValidUntil, discountTargetTier, peakStartTime, peakEndTime, pricePeak } = req.body;
    court.discount = {
      percentage: Number(discountPercentage) || 0,
      validUntil: discountValidUntil ? new Date(discountValidUntil) : null,
      targetTier: discountTargetTier || 'both'
    };
    court.peakStartTime = peakStartTime || '';
    court.peakEndTime = peakEndTime || '';
    if (pricePeak !== undefined && pricePeak !== '') {
      court.pricePeak = Number(pricePeak);
    } else {
      court.pricePeak = undefined;
    }

    await court.save();
    res.json(court);
  } catch (error) {
    next(error);
  }
});

router.put('/court-details', protect, manager, upload.array('images', 5), async (req, res, next) => {
  try {
    const court = await Court.findOne({ manager: req.user._id });
    if (!court) return res.status(404).json({ message: 'No court assigned' });

    if (req.body.name) court.name = req.body.name;
    if (req.body.location !== undefined) court.location = req.body.location;
    
    if (req.body.facilities) {
      court.facilities = Array.isArray(req.body.facilities) ? req.body.facilities : [req.body.facilities];
    } else if (req.body.facilities === '') {
      court.facilities = [];
    }

    if (req.body.amenities) {
      court.amenities = Array.isArray(req.body.amenities) ? req.body.amenities : [req.body.amenities];
    } else if (req.body.amenities === '') {
      court.amenities = [];
    }

    if (req.body.paymentBank !== undefined) court.paymentBank = req.body.paymentBank;
    if (req.body.paymentAccountTitle !== undefined) court.paymentAccountTitle = req.body.paymentAccountTitle;
    if (req.body.paymentAccountNumber !== undefined) court.paymentAccountNumber = req.body.paymentAccountNumber;
    if (req.body.advanceRequired !== undefined) court.advanceRequired = Number(req.body.advanceRequired) || 0;

    if (req.body.pricePerHour !== undefined && req.body.pricePerHour !== '') {
      court.pricePerHour = Number(req.body.pricePerHour);
    }
    
    if (req.body.peakStartTime !== undefined) court.peakStartTime = req.body.peakStartTime;
    if (req.body.peakEndTime !== undefined) court.peakEndTime = req.body.peakEndTime;
    if (req.body.pricePeak !== undefined && req.body.pricePeak !== '') {
      court.pricePeak = Number(req.body.pricePeak);
    } else if (req.body.pricePeak === '') {
      court.pricePeak = undefined;
    }

    if (req.files && req.files.length > 0) {
      court.images = req.files.map(file => file.path);
    }

    await court.save();
    res.json(court);
  } catch (error) {
    next(error);
  }
});

module.exports = router;