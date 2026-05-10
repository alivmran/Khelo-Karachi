const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { sendVerificationEmail } = require('../utils/emailService');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Helper to generate consistent tokens
const generateToken = (id) => {
  // We use 'userId' here because authMiddleware checks for 'decoded.userId'
  return jwt.sign({ userId: id }, process.env.SECRET_KEY, { expiresIn: '30d' });
};

// @desc    Register a new PLAYER (Public)
// @route   POST /api/auth/signup
// @access  Public
router.post('/signup', authLimiter, [
  body('name').notEmpty().withMessage('Name is required').trim().escape(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400);
       throw new Error(errors.array()[0].msg);
    }
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // FORCE role to be 'user'. 
    // Admins/Managers are ONLY created via the Admin Panel (adminRoutes.js)
    const user = await User.create({ 
      name, 
      email, 
      password, 
      role: 'user',       // New Field
      isAdmin: false,      // Deprecated but kept for compatibility
      isVerified: false,
      verificationCode,
      verificationCodeExpires
    });

    if (user) {
      // Send verification email asynchronously
      sendVerificationEmail(user.email, verificationCode);

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        message: 'Please check your email to verify your account.',
        // We might NOT send token here if we want them to login only after verify,
        // but let's keep token so they can access /verify-email if we protect it.
        // Actually, verify route will be public, so we don't strictly need it, but let's send it.
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Login & Get Token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authLimiter, [
  body('email').notEmpty().withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400);
       throw new Error(errors.array()[0].msg);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      // Check if verified ONLY for 'user' role
      if (user.role === 'user' && !user.isVerified) {
        // Bypass verification for old accounts (created before we implemented this feature, approx May 10 2026)
        // Or if they don't have a verification code and are an old account
        const featureLaunchDate = new Date('2026-05-09T00:00:00.000Z');
        if (user.createdAt < featureLaunchDate) {
          user.isVerified = true;
          await user.save();
        } else {
          // For old users or expired codes, generate a new one and send it
          if (!user.verificationCode || user.verificationCodeExpires < Date.now()) {
            const newCode = Math.floor(100000 + Math.random() * 900000).toString();
            user.verificationCode = newCode;
            user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
            await user.save();
            const { sendVerificationEmail } = require('../utils/emailService');
            sendVerificationEmail(user.email, newCode);
          }
          res.status(401);
          throw new Error('UNVERIFIED_EMAIL');
        }
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,      // Frontend needs this to decide which Dashboard to show
        isAdmin: user.isAdmin,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Verify Email Code
// @route   POST /api/auth/verify-email
// @access  Public
router.post('/verify-email', authLimiter, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code').notEmpty().withMessage('Verification code is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
       res.status(400);
       throw new Error(errors.array()[0].msg);
    }
    const { email, code } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.isVerified) {
      return res.json({ message: 'Email is already verified' });
    }

    if (user.verificationCode !== code) {
      res.status(400);
      throw new Error('Invalid verification code');
    }

    if (user.verificationCodeExpires < Date.now()) {
      res.status(400);
      throw new Error('Verification code has expired. Please sign up again to receive a new code.'); // Or implement resend logic
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      isVerified: user.isVerified,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Resend Verification Email
// @route   POST /api/auth/resend-verification
// @access  Public
router.post('/resend-verification', authLimiter, [
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (user.isVerified) {
      return res.json({ message: 'Email is already verified' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    sendVerificationEmail(user.email, verificationCode);

    res.json({ message: 'Verification code resent successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;