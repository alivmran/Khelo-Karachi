const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Court = require('../models/Court');
const Booking = require('../models/Booking');
const { protect, admin } = require('../middleware/authMiddleware');
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

// @desc    Global Admin Data
router.get('/data', protect, admin, async (req, res, next) => {
  try {
    const courts = await Court.find({}).populate('manager', 'name email');
    const managers = await User.find({ role: 'manager' });
    const disputes = await Booking.find({ status: 'Disputed' })
      .populate('user', 'name email')
      .populate({ path: 'court', select: 'name manager', populate: { path: 'manager', select: 'name email' } })
      .sort({ updatedAt: -1 });
    
    const totalBookings = await Booking.countDocuments();
    const totalRevenue = (await Booking.find({ status: 'Approved', type: 'Online' }))
        .reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

    res.json({ courts, managers, disputes, stats: { totalBookings, totalRevenue, pendingDisputes: disputes.length } });
  } catch (error) { next(error); }
});

// @desc    Create Court & Manager (FIXED)
router.post('/create-court', protect, admin, upload.array('images', 5), async (req, res, next) => {
  try {
    const {
      courtName,
      location,
      facilities,
      courtsDetail,
      amenities,
      googleMapLink,
      paymentBank,
      paymentAccountTitle,
      paymentAccountNumber,
      advanceRequired,
      operationalStartTime,
      operationalEndTime,
      pricePerHour,
      minSlots,
      discountPercentage,
      discountValidUntil,
      discountTargetTier,
      peakStartTime,
      peakEndTime,
      pricePeak,
      managerName,
      managerEmail,
      managerMobile,
      notificationEmail
    } = req.body;

    const startHour = parseHour(operationalStartTime || '00:00');
    const endHour = parseHour(operationalEndTime || '24:00');
    if (startHour === null || endHour === null) {
      res.status(400);
      throw new Error('Operational hours must be valid hourly values.');
    }

    // Check if Email Taken
    const existingUser = await User.findOne({ email: managerEmail });
    if (existingUser) {
        res.status(400);
        throw new Error(`Manager email '${managerEmail}' is already in use.`);
    }

    let parsedCourtsDetail = [];
    if (courtsDetail) {
      try {
        parsedCourtsDetail = typeof courtsDetail === 'string' ? JSON.parse(courtsDetail) : courtsDetail;
      } catch (e) {
        console.error('Failed to parse courtsDetail JSON string:', e);
      }
    }

    let finalFacilities = Array.isArray(facilities) ? facilities : (facilities ? [facilities] : []);
    if (parsedCourtsDetail && parsedCourtsDetail.length > 0) {
      const derivedSports = parsedCourtsDetail.map(c => c.sport).filter(Boolean);
      finalFacilities = [...new Set([...finalFacilities, ...derivedSports])];
    }

    const password = `${courtName.replace(/\s+/g, '')}123`;

    // Create Manager
    const manager = await User.create({
        name: managerName, email: managerEmail, mobile: managerMobile, password, role: 'manager'
    });

    // Images from Cloudinary
    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    // Create Court
    const court = await Court.create({
        name: courtName,
        location,
        facilities: finalFacilities,
        courtsDetail: parsedCourtsDetail,
        amenities: Array.isArray(amenities) ? amenities : (amenities ? [amenities] : []),
        googleMapLink,
        paymentBank,
        paymentAccountTitle,
        paymentAccountNumber,
        advanceRequired: advanceRequired || 0,
        operationalStartTime: operationalStartTime || '00:00',
        operationalEndTime: operationalEndTime || '24:00',
        pricePerHour: Number(pricePerHour) || 0,
        minSlots: Number(minSlots) || 1,
        discount: {
          percentage: Number(discountPercentage) || 0,
          validUntil: discountValidUntil ? new Date(discountValidUntil) : null,
          targetTier: discountTargetTier || 'both'
        },
        peakStartTime: peakStartTime || '',
        peakEndTime: peakEndTime || '',
        pricePeak: pricePeak ? Number(pricePeak) : undefined,
        manager: manager._id, 
        notificationEmail,
        images: imageUrls
    });

    manager.managedCourt = court._id;
    await manager.save();

    res.status(201).json({ message: 'Created', court, manager: { email: manager.email, password } });

  } catch (error) {
    console.error('Create Court Error:', error);
    if (error.code === 11000) {
        res.status(400);
        next(new Error(`Duplicate Data: Email or Court Name already exists.`));
    } else if (error.name === 'ValidationError') {
        res.status(400);
        const messages = Object.values(error.errors).map(val => val.message);
        next(new Error(`Validation Failed: ${messages.join(', ')}`));
    } else {
        res.status(500);
        next(error);
    }
  }
});

// @desc    Specific Court Analytics
router.get('/court/:id/stats', protect, admin, async (req, res, next) => {
  try {
    const courtId = req.params.id;
    const court = await Court.findById(courtId);
    if (!court) { res.status(404); throw new Error('Court not found'); }

    const bookings = await Booking.find({ court: courtId }).populate('user', 'name email').sort({ date: -1 });

    const totalRevenue = bookings
        .filter(b => b.status === 'Approved' && b.type === 'Online')
        .reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);

    const activeBookings = bookings.filter(b => b.status === 'Approved').length;
    const canceledBookings = bookings.filter(b => b.status === 'Rejected').length;
    const uniqueUsers = [...new Set(bookings.map(b => b.user?.email).filter(Boolean))].length;

    res.json({
      court,
      stats: { totalRevenue, totalBookings: bookings.length, activeBookings, canceledBookings, uniqueUserCount: uniqueUsers },
      bookings
    });
  } catch (error) { next(error); }
});

// @desc    Assign Manager to Existing Court
router.post('/assign-manager', protect, admin, async (req, res, next) => {
  try {
    const { courtId, managerName, managerEmail, managerMobile, notificationEmail } = req.body;
    const court = await Court.findById(courtId);
    if (!court) throw new Error('Court not found');
    const existingUser = await User.findOne({ email: managerEmail });
    if (existingUser) throw new Error(`Manager email '${managerEmail}' is already in use.`);
    const password = req.body.password;
    const manager = await User.create({ name: managerName, email: managerEmail, mobile: managerMobile, password, role: 'manager', managedCourt: court._id });
    court.manager = manager._id;
    if (notificationEmail) court.notificationEmail = notificationEmail;
    await court.save();
    res.status(201).json({ message: 'Manager Assigned', manager: { email: manager.email, password } });
  } catch(error) {
    if (error.code === 11000) {
        res.status(400);
        next(new Error(`Duplicate Data: Email already exists.`));
    } else {
        next(error);
    }
  }
});

// @desc    Reset Manager Password
// @route   POST /api/admin/reset-manager-password
// @access  Private Admin
router.post('/reset-manager-password', protect, admin, async (req, res, next) => {
  try {
    const { managerId, newPassword } = req.body;
    const manager = await User.findById(managerId);
    if (!manager) throw new Error('Manager not found');
    manager.password = newPassword;
    await manager.save();
    res.json({ message: 'Password updated successfully' });
  } catch(error) {
    next(error);
  }
});

// @desc    Update Court
router.put('/court/:id', protect, admin, upload.array('images', 5), async (req, res, next) => {
    try {
        const updateData = { ...req.body };
        if (req.body.facilities) {
          updateData.facilities = Array.isArray(req.body.facilities) ? req.body.facilities : [req.body.facilities];
        }
        if (req.body.courtsDetail) {
          try {
            updateData.courtsDetail = typeof req.body.courtsDetail === 'string' ? JSON.parse(req.body.courtsDetail) : req.body.courtsDetail;
            if (Array.isArray(updateData.courtsDetail) && updateData.courtsDetail.length > 0) {
              const derivedSports = updateData.courtsDetail.map(c => c.sport).filter(Boolean);
              updateData.facilities = [...new Set([...(updateData.facilities || []), ...derivedSports])];
            }
          } catch (e) {
            console.error('Failed to parse courtsDetail in PUT:', e);
          }
        }
        if (req.body.amenities) {
          updateData.amenities = Array.isArray(req.body.amenities) ? req.body.amenities : [req.body.amenities];
        }
        if (req.files && req.files.length > 0) {
          const imageUrls = req.files.map(file => file.path);
          updateData.images = imageUrls;
        }
        if (req.body.discountPercentage !== undefined || req.body.discountValidUntil !== undefined || req.body.discountTargetTier !== undefined) {
          updateData.discount = {
            percentage: Number(req.body.discountPercentage) || 0,
            validUntil: req.body.discountValidUntil ? new Date(req.body.discountValidUntil) : null,
            targetTier: req.body.discountTargetTier || 'both'
          };
        }
        const court = await Court.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(court);
    } catch (error) { next(error); }
});

// @desc    Delete Court
router.delete('/court/:id', protect, admin, async (req, res, next) => {
    try {
        const court = await Court.findById(req.params.id);
        if(court && court.manager) await User.findByIdAndDelete(court.manager);
        await Court.deleteOne({ _id: req.params.id });
        res.json({ message: 'Deleted' });
    } catch (error) { next(error); }
});

// @desc    Admin Block Slot
router.post('/block-slot', protect, admin, async (req, res, next) => {
    try {
        const { courtId, facility, date, startTime, endTime, timeBlocks } = req.body;
        const court = await Court.findById(courtId);
        if (!court) {
          res.status(404);
          throw new Error('Court not found');
        }
        const blocks = Array.isArray(timeBlocks) && timeBlocks.length > 0
          ? timeBlocks
          : [{ startTime, endTime }];

        for (const block of blocks) {
          const blockStartHour = parseHour(block.startTime);
          const blockEndHour = parseHour(block.endTime);
          const openHour = parseHour(court.operationalStartTime || '00:00');
          const closeHour = parseHour(court.operationalEndTime || '24:00');
          if (blockStartHour === null || blockEndHour === null || blockEndHour <= blockStartHour) {
            res.status(400);
            throw new Error('Invalid time block.');
          }
          if (isOutsideHours(blockStartHour, blockEndHour, openHour, closeHour)) {
            res.status(400);
            throw new Error('Block time is outside operational hours.');
          }
          const conflict = await Booking.findOne({ court: courtId, facility, date, startTime: block.startTime, status: { $ne: 'Rejected' } });
          if(conflict) { res.status(400); throw new Error(`Slot ${block.startTime}-${block.endTime} occupied`); }
          
          await Booking.create({
              court: courtId, facility, user: req.user._id, date, startTime: block.startTime, endTime: block.endTime,
              status: 'Approved', type: 'ManualBlock', totalPrice: 0
          });
        }
        res.status(201).json({ message: 'Blocked' });
    } catch (error) { next(error); }
});

router.put('/disputes/:id/resolve', protect, admin, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404);
      throw new Error('Dispute booking not found');
    }
    if (booking.status !== 'Disputed') {
      res.status(400);
      throw new Error('This booking is not in disputed state');
    }
    booking.status = 'Refunded';
    await booking.save();

    const bookingUser = await User.findById(booking.user);
    if (bookingUser) {
      sendEmail(bookingUser.email, 'Dispute Resolved', 'Dispute Resolved', 'Your dispute has been resolved by the admin and the status has been updated to Refunded.');
    }

    res.json({ message: 'Dispute marked as resolved.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;