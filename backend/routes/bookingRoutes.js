const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Court = require('../models/Court');
const { protect, admin, manager } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // max 15 bookings per hour per IP
  message: 'Too many bookings created from this IP, please try again after an hour'
});

const parseHour = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return null;
  const [h, m] = timeString.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || m !== 0 || h < 0 || h > 24) return null;
  return h;
};

const OCCUPIED_STATUSES = ['Awaiting Payment', 'Pending', 'Approved'];

// @desc    Block a Time Slot (Manual Block)
// @access  Manager (Own Court) or Admin (Any Court)
router.post('/block', protect, manager, async (req, res, next) => {
  try {
    const { courtId, date, startTime, endTime, facility } = req.body;
    if (!facility) {
      res.status(400);
      throw new Error('Facility is required.');
    }

    // 1. Permission Check: If Manager, ensure they own this court
    if (req.user.role === 'manager') {
        const court = await Court.findById(courtId);
        if (!court || court.manager.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error('Not authorized to block this court');
        }
    }

    // 2. Check for Conflicts (Approved or ManualBlock)
    const existingApproved = await Booking.findOne({
      court: courtId,
      facility,
      date: date,
      startTime: startTime,
      status: { $in: OCCUPIED_STATUSES }
    });

    if (existingApproved) {
      res.status(400);
      throw new Error('Slot already occupied.');
    }

    // 3. Create Block
    const court = await Court.findById(courtId);
    const openHour = parseHour(court?.operationalStartTime || '00:00');
    const closeHour = parseHour(court?.operationalEndTime || '24:00');
    const startHour = parseHour(startTime);
    const endHour = parseHour(endTime);
    if (startHour < openHour || endHour > closeHour) {
      res.status(400);
      throw new Error('Selected time is outside operational hours.');
    }
    const booking = new Booking({
      user: req.user._id, 
      court: courtId,
      facility,
      date,
      startTime,
      endTime,
      status: 'Approved',
      type: 'ManualBlock', // Important for Analytics
      totalPrice: 0 // Blocks have no revenue
    });

    await booking.save();
    res.status(201).json({ message: 'Time slot blocked successfully' });

  } catch (error) {
    next(error);
  }
});

// @desc    Get Unavailable Slots
// @access  Public/User
router.get('/availability', async (req, res, next) => {
  try {
      const { courtId, date, facility } = req.query;
      if (!courtId || !date || !facility) return res.json([]);
      
      const bookings = await Booking.find({
          court: courtId,
          facility,
          date: date,
          status: { $in: OCCUPIED_STATUSES }
      });
      
      let unavailable = [];
      bookings.forEach(b => {
          // Add individual hourly slots between startTime and endTime
          const startHour = parseInt(b.startTime.split(':')[0]);
          const endHour = parseInt(b.endTime.split(':')[0]);
          for(let i=startHour; i<endHour; i++) {
              const start = i.toString().padStart(2, '0') + ':00';
              const end = (i+1).toString().padStart(2, '0') + ':00';
              unavailable.push(`${start}-${end}`);
          }
      });
      
      res.json([...new Set(unavailable)]);
  } catch (error) {
      next(error);
  }
});

// @desc    Create Online Booking
// @access  User
router.post('/', protect, bookingLimiter, async (req, res, next) => {
  try {
    const { courtId, date, timeBlocks, totalPrice, facility } = req.body;

    if (!facility) {
      res.status(400);
      throw new Error('Facility is required.');
    }
    if (!timeBlocks || timeBlocks.length === 0) {
      res.status(400); throw new Error('No time slots provided.');
    }

    const pendingCount = await Booking.countDocuments({ user: req.user._id, status: { $in: ['Awaiting Payment', 'Pending'] } });
    if (pendingCount + timeBlocks.length > 3) {
        res.status(400); throw new Error('You can only have up to 3 pending booking slots at a time. Please wait for approval or cancel a pending request.');
    }

    const court = await Court.findById(courtId);
    if (!court) {
      res.status(404);
      throw new Error('Court not found.');
    }
    const openHour = parseHour(court.operationalStartTime || '00:00');
    const closeHour = parseHour(court.operationalEndTime || '24:00');
    const createdBookings = [];
    const pricePerBlock = totalPrice / timeBlocks.length;

    for (let block of timeBlocks) {
      const { startTime, endTime } = block;
      const startHour = parseHour(startTime);
      const endHour = parseHour(endTime);
      if (startHour === null || endHour === null || endHour <= startHour) {
        res.status(400);
        throw new Error('Invalid slot selected.');
      }
      if (startHour < openHour || endHour > closeHour) {
        res.status(400);
        throw new Error(`Slot ${startTime}-${endTime} is outside operational hours.`);
      }

      // Check conflicts (Approved or Pending or ManualBlock)
      const existingApproved = await Booking.findOne({
        court: courtId,
        facility,
        date: date,
        status: { $in: OCCUPIED_STATUSES },
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
        ]
      });

      if (existingApproved) {
        res.status(400); throw new Error(`Slot ${startTime}-${endTime} is not available.`);
      }

      const booking = new Booking({
        user: req.user._id,
        court: courtId,
        facility,
        date,
        startTime,
        endTime,
        status: 'Awaiting Payment',
        type: 'Online',
        totalPrice: pricePerBlock || 0
      });

      await booking.save();
      createdBookings.push(booking);
    }

    res.status(201).json(createdBookings);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/submit-payment-proof', protect, async (req, res, next) => {
  try {
    const { senderName, transactionIdShort } = req.body;
    if (!senderName || !senderName.trim()) {
      res.status(400);
      throw new Error('Sender account name is required.');
    }
    if (!/^\d{4}$/.test(transactionIdShort || '')) {
      res.status(400);
      throw new Error('Last 4 digits of TID must be exactly 4 numbers.');
    }

    const booking = await Booking.findById(req.params.id).populate('court');
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }
    if (booking.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized');
    }
    if (booking.status !== 'Awaiting Payment') {
      res.status(400);
      throw new Error('Booking is not awaiting payment.');
    }

    booking.senderName = senderName.trim();
    booking.transactionIdShort = transactionIdShort;
    booking.advancePaid = booking.court?.advanceRequired || 0;
    booking.status = 'Pending';
    const updatedBooking = await booking.save();

    const Notification = require('../models/Notification');
    if (booking.court && booking.court.manager) {
      const notif = new Notification({
        recipient: booking.court.manager,
        message: `New payment proof submitted for booking at ${booking.court.name}. Action required.`,
        type: 'booking'
      });
      await notif.save();
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets');
      if (io && userSockets && userSockets.has(booking.court.manager.toString())) {
        io.to(userSockets.get(booking.court.manager.toString())).emit('newNotification', notif);
      }
    }

    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
});

// @desc    Get MY Bookings
// @access  User
router.get('/mybookings', protect, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
        .populate('court', 'name facilities location')
        .sort({ date: -1 }); // Newest first
    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

// @desc    Request Reschedule
// @access  User
router.put('/:id/reschedule', protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404); throw new Error('Booking not found');
    }
    if (booking.user.toString() !== req.user._id.toString()) {
      res.status(401); throw new Error('Not authorized');
    }

    // Check 6-hour rule
    const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
    const now = new Date();
    const diffHours = (bookingDateTime - now) / (1000 * 60 * 60);
    if (diffHours < 6) {
      res.status(400); throw new Error('Cannot reschedule less than 6 hours before booked time.');
    }

    const { date, startTime, endTime } = req.body;
    
    // Check conflict for the new slot
    const conflict = await Booking.findOne({
      court: booking.court,
      facility: booking.facility,
      date: date,
      startTime: startTime,
      status: { $in: OCCUPIED_STATUSES },
      _id: { $ne: booking._id }
    });

    if (conflict) {
      res.status(400); throw new Error('New slot is already taken');
    }

    booking.status = 'Reschedule Requested';
    booking.rescheduleDetails = { date, startTime, endTime };
    const updatedBooking = await booking.save();

    // Create Notification for Manager
    const Notification = require('../models/Notification');
    const court = await Court.findById(booking.court);
    if (court && court.manager) {
      const notif = new Notification({
        recipient: court.manager,
        message: `User requested to reschedule booking to ${date} at ${startTime}.`,
        type: 'booking'
      });
      await notif.save();
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets');
      if (io && userSockets && userSockets.has(court.manager.toString())) {
        io.to(userSockets.get(court.manager.toString())).emit('newNotification', notif);
      }
    }

    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
});

// @desc    Accept/Reject Reschedule
// @access  Manager
router.put('/:id/reschedule-response', protect, manager, async (req, res, next) => {
  try {
    const { accept } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404); throw new Error('Booking not found');
    }

    const court = await Court.findById(booking.court);
    if (!court || (req.user.role === 'manager' && court.manager.toString() !== req.user._id.toString())) {
      res.status(401); throw new Error('Not authorized for this court');
    }

    if (booking.status !== 'Reschedule Requested') {
      res.status(400); throw new Error('No reschedule requested for this booking.');
    }

    const Notification = require('../models/Notification');
    if (accept) {
      booking.date = booking.rescheduleDetails.date;
      booking.startTime = booking.rescheduleDetails.startTime;
      booking.endTime = booking.rescheduleDetails.endTime;
      booking.status = 'Approved';
    } else {
      booking.status = 'Approved'; // Return to previous state
    }
    booking.rescheduleDetails = null;
    const updatedBooking = await booking.save();

    // Notify User
    const msg = accept ? `Your reschedule request for ${court.name} was approved.` : `Your reschedule request for ${court.name} was rejected.`;
    const notif = new Notification({
      recipient: booking.user,
      message: msg,
      type: 'booking'
    });
    await notif.save();
    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    if (io && userSockets && userSockets.has(booking.user.toString())) {
      io.to(userSockets.get(booking.user.toString())).emit('newNotification', notif);
    }

    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
});

// @desc    Get ALL Bookings (For Admin & Manager Tables)
// @access  Manager or Admin
router.get('/all', protect, manager, async (req, res, next) => {
  try {
    let query = {};

    // IF MANAGER: Only show bookings for their court
    if (req.user.role === 'manager') {
        const myCourt = await Court.findOne({ manager: req.user._id });
        if (!myCourt) return res.json([]); // No court assigned
        query = { court: myCourt._id };
    }
    // IF ADMIN: query remains empty {} -> returns all

    const bookings = await Booking.find(query)
        .populate('user', 'name email')
        .populate('court', 'name')
        .sort({ date: -1 });
        
    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

// @desc    Delete/Cancel Booking
// @access  User (Own), Manager (Own Court), Admin (Any)
router.delete('/:id', protect, async (req, res, next) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if(!booking) { res.status(404); throw new Error('Booking not found'); }

      let authorized = false;

      // 1. User owns it
      if (booking.user && booking.user.toString() === req.user._id.toString()) authorized = true;
      // 2. Admin
      if (req.user.role === 'admin') authorized = true;
      // 3. Manager owns the court
      if (req.user.role === 'manager') {
          const court = await Court.findById(booking.court);
          if (court && court.manager.toString() === req.user._id.toString()) authorized = true;
      }

      if (!authorized) {
          res.status(401); throw new Error('Not authorized');
      }

      await Booking.deleteOne({ _id: req.params.id });
      res.json({ message: 'Booking removed' });

    } catch (error) {
      next(error);
    }
});

// @desc    Approve/Reject Booking
// @access  Manager (Own Court) or Admin
router.patch('/:id/status', protect, manager, async (req, res, next) => {
    try {
        const { status } = req.body; 
        const booking = await Booking.findById(req.params.id);

        if(!booking) { res.status(404); throw new Error('Booking not found'); }

        // Manager Check
        if (req.user.role === 'manager') {
            const court = await Court.findById(booking.court);
            if (!court || court.manager.toString() !== req.user._id.toString()) {
                res.status(401); throw new Error('Not authorized for this court');
            }
        }

        if(status === 'Approved') {
            const conflict = await Booking.findOne({
                court: booking.court,
                facility: booking.facility,
                date: booking.date,
                startTime: booking.startTime,
                status: 'Approved', // Only check against actually approved slots
                _id: { $ne: booking._id }
            });
            
            if(conflict) {
                res.status(400);
                throw new Error('Cannot approve. Slot already taken.');
            }
        }

        booking.status = status;
        const updatedBooking = await booking.save();
        res.json(updatedBooking);

    } catch (error) {
        next(error);
    }
});

router.put('/:id/supply-refund-info', protect, async (req, res, next) => {
  try {
    const { refundBankName, refundAccountTitle, refundAccountNumber, refundContactNumber } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }
    if (booking.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized');
    }
    if (booking.status !== 'Awaiting Refund Details') {
      res.status(400);
      throw new Error('Booking is not awaiting refund details.');
    }
    booking.refundBankName = refundBankName;
    booking.refundAccountTitle = refundAccountTitle;
    booking.refundAccountNumber = refundAccountNumber;
    booking.refundContactNumber = refundContactNumber;
    booking.status = 'Refund Pending';
    const updatedBooking = await booking.save();

    const Notification = require('../models/Notification');
    const court = await Court.findById(booking.court);
    if (court && court.manager) {
      const notif = new Notification({
        recipient: court.manager,
        message: `User provided refund details for booking at ${court.name}. Action required.`,
        type: 'booking'
      });
      await notif.save();
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets');
      if (io && userSockets && userSockets.has(court.manager.toString())) {
        io.to(userSockets.get(court.manager.toString())).emit('newNotification', notif);
      }
    }

    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/reject', protect, manager, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }
    if (req.user.role === 'manager') {
      const court = await Court.findById(booking.court);
      if (!court || court.manager.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized for this court');
      }
    }
    booking.status = 'Awaiting Refund Details';
    const updatedBooking = await booking.save();
    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/complete-refund', protect, manager, async (req, res, next) => {
  try {
    const { refundTransactionId } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }
    if (req.user.role === 'manager') {
      const court = await Court.findById(booking.court);
      if (!court || court.manager.toString() !== req.user._id.toString()) {
        res.status(401);
        throw new Error('Not authorized for this court');
      }
    }
    if (booking.status !== 'Refund Pending') {
      res.status(400);
      throw new Error('Booking is not in refund pending state.');
    }
    booking.refundTransactionId = refundTransactionId;
    booking.status = 'Refund Claimed';
    const updatedBooking = await booking.save();

    const Notification = require('../models/Notification');
    const courtData = await Court.findById(booking.court);
    const notif = new Notification({
      recipient: booking.user,
      message: `Refund sent for ${courtData.name}. Please verify receipt.`,
      type: 'booking'
    });
    await notif.save();
    const io = req.app.get('io');
    const userSockets = req.app.get('userSockets');
    if (io && userSockets && userSockets.has(booking.user.toString())) {
      io.to(userSockets.get(booking.user.toString())).emit('newNotification', notif);
    }

    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/verify-refund', protect, async (req, res, next) => {
  try {
    const { received, disputeReason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }
    if (booking.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized');
    }
    if (booking.status !== 'Refund Claimed') {
      res.status(400);
      throw new Error('Booking is not ready for verification.');
    }
    if (received) {
      booking.status = 'Refunded';
      booking.disputeReason = '';
    } else {
      booking.status = 'Disputed';
      booking.disputeReason = disputeReason;
      
      const Notification = require('../models/Notification');
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' });
      const court = await Court.findById(booking.court);
      
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets');
      
      for (const admin of admins) {
        const notif = new Notification({
          recipient: admin._id,
          message: `Dispute created by user for booking at ${court ? court.name : 'Unknown Court'}. Reason: ${disputeReason}`,
          type: 'booking'
        });
        await notif.save();
        if (io && userSockets && userSockets.has(admin._id.toString())) {
          io.to(userSockets.get(admin._id.toString())).emit('newNotification', notif);
        }
      }
    }
    const updatedBooking = await booking.save();
    res.json(updatedBooking);
  } catch (error) {
    next(error);
  }
});

module.exports = router;