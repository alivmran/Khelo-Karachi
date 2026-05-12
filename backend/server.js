const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const Booking = require('./models/Booking');

const errorHandler = require('./middleware/errorMiddleware');
const notFound = require('./middleware/notFoundMiddleware');

const authRoutes = require('./routes/authRoutes');
const courtRoutes = require('./routes/courtRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const matchRoutes = require('./routes/matchRoutes');
const managerRoutes = require('./routes/managerRoutes');
const notificationRoutes = require('./routes/notificationRoutes');


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected...'))
  .catch((err) => console.error(`Error: ${err.message}`));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.set('io', io);

const userSockets = new Map();
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('register', (userId) => {
    userSockets.set(userId, socket.id);
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        break;
      }
    }
    console.log('User disconnected:', socket.id);
  });
});
app.set('userSockets', userSockets);

app.use(cors());
app.use(express.json()); 

app.use((req, res, next) => {
  res.on('finish', () => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      if (req.originalUrl.includes('/api/bookings') || req.originalUrl.includes('/api/matches')) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const io = req.app.get('io');
          if (io) io.emit('refreshBookings');
        }
      }
    }
  });
  next();
});

app.use('/api/users', authRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Auto-Expire Pending Bookings (Cron Job)
cron.schedule('*/30 * * * *', async () => {
  console.log('Running cron job: Expiring stale pending bookings...');
  try {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const result = await Booking.updateMany(
      {
        status: { $in: ['Awaiting Payment', 'Pending'] },
        paymentScreenshot: { $exists: false },
        createdAt: { $lte: thirtyMinsAgo }
      },
      {
        $set: { status: 'Canceled', disputeReason: 'Auto-expired due to missing payment details.' }
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`Auto-expired ${result.modifiedCount} bookings.`);
    }
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});