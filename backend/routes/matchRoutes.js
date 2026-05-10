const express = require('express');
const router = express.Router();
const MatchPost = require('../models/MatchPost');
const Request = require('../models/Request');
const User = require('../models/User');

const Booking = require('../models/Booking');
const { protect } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/emailService');

const toDateTime = (dateStr, startTime) => new Date(`${dateStr}T${startTime}:00`);
const isUpcoming = (dateStr, startTime) => toDateTime(dateStr, startTime) > new Date();

const runMatchCleanup = async () => {
  const now = new Date();
  const staleOpenPosts = await MatchPost.find({ status: 'Open' });
  for (const post of staleOpenPosts) {
    if (toDateTime(post.date, post.startTime) < now) {
      post.status = 'Closed';
      await post.save();
      await Request.updateMany({ matchPost: post._id, status: 'PENDING' }, { status: 'EXPIRED' });
    }
  }
};

// ==========================
// MATCH POSTS ROUTES
// ==========================

// @desc    Create a new Match Post
// @route   POST /api/matches/posts
// @access  Private
router.post('/posts', protect, async (req, res, next) => {
  try {
    const {
      bookingId,
      adHocTeamName,
      mobile,
      mySquadSize,
      opponentSquadSize
    } = req.body;

    // 1. Verify that the booking belongs to the user
    const booking = await Booking.findById(bookingId).populate('court');
    if (!booking || booking.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Invalid booking or you do not own this booking');
    }

    if (!isUpcoming(booking.date, booking.startTime)) {
        res.status(400);
        throw new Error('Cannot post a match for a past date/time.');
    }

    // 2. Prevent duplicate posts for the same booking
    const existing = await MatchPost.findOne({ booking: bookingId });
    if (existing) {
      res.status(400);
      throw new Error('A post already exists for this booking');
    }

    // 3. Create the post
    const post = await MatchPost.create({
      user: req.user._id,
      booking: bookingId,
      court: booking.court._id,
      date: booking.date,
      startTime: booking.startTime,
      adHocTeamName,
      mobile,
      mySquadSize,
      opponentSquadSize,
      status: 'Open'
    });

    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

// @desc    Get all Open Match Posts
// @route   GET /api/matches/posts
// @access  Public
router.get('/posts', async (req, res, next) => {
  try {
    await runMatchCleanup();
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const query = { status: 'Open', date: { $gte: today } };

    if (req.query.all === 'true') {
        const posts = await MatchPost.find(query)
          .populate('user', 'name')
          .populate('court', 'name facilities location')
          .sort({ createdAt: -1 });
        return res.json(posts);
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const posts = await MatchPost.find(query)
      .populate('user', 'name')
      .populate('court', 'name facilities location')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await MatchPost.countDocuments(query);

    res.json({
      posts,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get Match History
// @route   GET /api/matches/history
// @access  Private
router.get('/history', protect, async (req, res, next) => {
  try {
    await runMatchCleanup();
    // --- BACKGROUND CLEANUP ---
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    MatchPost.deleteMany({ date: { $lt: thirtyDaysAgo } }).exec().catch(e => console.error('Cleanup error:', e));
    // --------------------------

    const hosted = await MatchPost.find({ user: req.user._id, status: 'Closed' })
      .populate('court', 'name facilities location')
      .populate('challengerUser', 'name')
      .sort({ createdAt: -1 });

    const requests = await Request.find({ sender: req.user._id, status: 'ACCEPTED' })
      .populate({
        path: 'matchPost',
        populate: { path: 'court', select: 'name facilities location' }
      }).sort({ createdAt: -1 });

    const challenged = requests.map(r => r.matchPost).filter(Boolean);

    res.json({ hosted, challenged });
  } catch (error) {
    next(error);
  }
});

// ==========================
// REQUEST SYSTEM ROUTES
// ==========================

// @desc    Send a Challenge or Join Request
// @route   POST /api/matches/requests
// @access  Private
router.post('/requests', protect, async (req, res, next) => {
  try {
    const { type, targetId } = req.body; // type: 'CHALLENGE'
    let receiverId;
    let matchPostId = null;

    if (type === 'CHALLENGE') {
      const post = await MatchPost.findById(targetId);
      if (!post) throw new Error('Match Post not found');
      receiverId = post.user;
      matchPostId = targetId;
    } else {
      res.status(400);
      throw new Error('Invalid Request Type');
    }

    // Prevent requesting yourself
    if (receiverId.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error('You cannot send a request to yourself');
    }

    // Check if request already exists
    const query = {
      sender: req.user._id,
      receiver: receiverId,
      status: 'PENDING',
      type: type
    };
    if (matchPostId) query.matchPost = matchPostId;

    const existing = await Request.findOne(query);

    if (existing) {
      res.status(400);
      throw new Error('You have already sent a request.');
    }

    // Create Request
    const request = await Request.create({
      sender: req.user._id,
      receiver: receiverId,
      type,
      matchPost: matchPostId
    });

    const receiverUser = await User.findById(receiverId);
    if (receiverUser) {
      sendEmail(receiverUser.email, 'New Challenge Request', 'New Match Challenge', `You have received a new challenge request. Check your Khelo Karachi dashboard to respond.`);

      // In-app notification
      const Notification = require('../models/Notification');
      const notif = new Notification({
        recipient: receiverId,
        message: `${req.user.name} has challenged your team!`,
        type: 'match'
      });
      await notif.save();
      const io = req.app.get('io');
      const userSockets = req.app.get('userSockets');
      if (io && userSockets && userSockets.has(receiverId.toString())) {
        io.to(userSockets.get(receiverId.toString())).emit('newNotification', notif);
      }
    }

    res.status(201).json(request);

  } catch (error) {
    next(error);
  }
});

// @desc    Get My Incoming Requests (Inbox)
// @route   GET /api/matches/requests/inbox
// @access  Private
router.get('/requests/inbox', protect, async (req, res, next) => {
  try {
    const requests = await Request.find({ receiver: req.user._id, status: { $in: ['PENDING', 'ACCEPTED'] } })
      .populate('sender', 'name email matchesPlayed noShows')
      .populate({
        path: 'matchPost',
        populate: { path: 'court', select: 'name' }
      });
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// @desc    Get My Sent Requests (Sent Challenges)
// @route   GET /api/matches/requests/sent
// @access  Private
router.get('/requests/sent', protect, async (req, res, next) => {
  try {
    const requests = await Request.find({ sender: req.user._id, status: { $in: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'] } })
      .populate('receiver', 'name email')
      .populate({
        path: 'matchPost',
        populate: { path: 'court', select: 'name facilities' },
        select: 'date startTime adHocTeamName mobile court'
      }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// @desc    Accept or Reject a Request
// @route   PUT /api/matches/requests/:id
// @access  Private
router.put('/requests/:id', protect, async (req, res, next) => {
  try {
    const { status } = req.body; // 'ACCEPTED' or 'REJECTED'

    const request = await Request.findById(req.params.id);

    if (!request) {
      res.status(404);
      throw new Error('Request not found');
    }

    // Verify receiver
    if (request.receiver.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Not authorized to respond to this request');
    }

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      res.status(400);
      throw new Error('Invalid status');
    }
    if (request.status !== 'PENDING') {
      res.status(400);
      throw new Error('Only pending requests can be accepted/rejected');
    }
    const postForValidation = await MatchPost.findById(request.matchPost);
    if (!postForValidation || !isUpcoming(postForValidation.date, postForValidation.startTime)) {
      res.status(400);
      throw new Error('Match is no longer upcoming.');
    }

    request.status = status;
    await request.save();

    if (status === 'ACCEPTED') {


      // Case 3: Challenging a Team (Match Set)
      if (request.type === 'CHALLENGE' && request.matchPost) {
        const post = await MatchPost.findById(request.matchPost);
        if (post) {
          const hostHasConflict = await MatchPost.findOne({
            user: post.user,
            status: 'Closed',
            date: post.date,
            startTime: post.startTime,
            _id: { $ne: post._id }
          });
          const challengerHasConflict = await MatchPost.findOne({
            challengerUser: request.sender,
            status: 'Closed',
            date: post.date,
            startTime: post.startTime,
            _id: { $ne: post._id }
          });
          const senderHostingConflict = await MatchPost.findOne({
            user: request.sender,
            status: 'Closed',
            date: post.date,
            startTime: post.startTime,
            _id: { $ne: post._id }
          });
          if (hostHasConflict || challengerHasConflict || senderHostingConflict) {
            request.status = 'REJECTED';
            await request.save();
            res.status(400);
            throw new Error('Cannot accept due to overlapping accepted match.');
          }
          post.status = 'Closed'; // Match is set
          post.challengerUser = request.sender;
          await post.save();
          await Request.updateMany(
            { matchPost: post._id, _id: { $ne: request._id }, status: 'PENDING' },
            { status: 'REJECTED' }
          );
        }
      }
    }

    if (status === 'ACCEPTED') {
      const senderUser = await User.findById(request.sender);
      if (senderUser) {
        sendEmail(senderUser.email, 'Challenge Accepted', 'Challenge Accepted', `Your challenge has been accepted! See you on the pitch.`);
      }
      sendEmail(req.user.email, 'Challenge Accepted', 'Challenge Accepted', `You have accepted the challenge. Prepare your squad!`);
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
});

router.put('/requests/:id/cancel', protect, async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      res.status(404);
      throw new Error('Request not found');
    }
    if (
      request.sender.toString() !== req.user._id.toString() &&
      request.receiver.toString() !== req.user._id.toString()
    ) {
      res.status(401);
      throw new Error('Not authorized to cancel this request');
    }
    const post = await MatchPost.findById(request.matchPost);
    if (!post || !isUpcoming(post.date, post.startTime)) {
      res.status(400);
      throw new Error('Cannot cancel after match time.');
    }
    if (!['PENDING', 'ACCEPTED'].includes(request.status)) {
      res.status(400);
      throw new Error('Only pending/accepted requests can be cancelled');
    }
    const previousStatus = request.status;
    request.status = 'CANCELLED';
    await request.save();

    if (previousStatus === 'ACCEPTED' && post.challengerUser) {
      post.status = 'Open';
      post.challengerUser = null;
      post.attendanceReported = false;
      await post.save();
    }
    res.json({ message: 'Request cancelled successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/reminders/upcoming', protect, async (req, res, next) => {
  try {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const closedMatches = await MatchPost.find({
      status: 'Closed',
      $or: [{ user: req.user._id }, { challengerUser: req.user._id }]
    }).populate('court', 'name');

    const reminders = closedMatches
      .filter((m) => {
        const dt = toDateTime(m.date, m.startTime);
        return dt > now && dt <= twoHoursLater;
      })
      .map((m) => ({
        matchId: m._id,
        courtName: m.court?.name,
        date: m.date,
        startTime: m.startTime,
        message: `Upcoming match at ${m.court?.name} on ${m.date} ${m.startTime}`
      }));

    res.json(reminders);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/report-attendance', protect, async (req, res, next) => {
  try {
    const { challengerAttended } = req.body;
    const match = await MatchPost.findById(req.params.id);
    if (!match) {
      res.status(404);
      throw new Error('Match post not found');
    }
    if (match.user.toString() !== req.user._id.toString()) {
      res.status(401);
      throw new Error('Only host can report attendance');
    }
    if (match.status !== 'Closed') {
      res.status(400);
      throw new Error('Attendance can only be reported for closed matches');
    }
    if (match.attendanceReported) {
      res.status(400);
      throw new Error('Attendance already reported for this match');
    }
    if (!match.challengerUser) {
      res.status(400);
      throw new Error('No accepted challenger found for this match');
    }

    const inc = challengerAttended ? { matchesPlayed: 1 } : { noShows: 1 };
    await User.findByIdAndUpdate(match.challengerUser, { $inc: inc });
    // Also increment host's matchesPlayed (host always showed up since they're reporting)
    await User.findByIdAndUpdate(match.user, { $inc: { matchesPlayed: 1 } });
    match.attendanceReported = true;
    await match.save();

    if (!challengerAttended) {
      const challenger = await User.findById(match.challengerUser);
      if (challenger) {
        sendEmail(challenger.email, 'No-Show Reported', 'Attendance Report', `You have been marked as a no-show for your recent match. Repeated no-shows may result in account suspension.`);
      }
    }

    res.json({ message: 'Attendance reported successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;