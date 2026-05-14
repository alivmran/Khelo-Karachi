const mongoose = require('mongoose');

const bookingSchema = mongoose.Schema({
  court: { type: mongoose.Schema.Types.ObjectId, ref: 'Court', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  facility: {
    type: String,
    required: true
  },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  status: { 
    type: String, 
    enum: [
      'Awaiting Payment',
      'Pending',
      'Approved',
      'Rejected',
      'Awaiting Refund Details',
      'Refund Pending',
      'Refund Claimed',
      'Refunded',
      'Disputed',
      'Reschedule Requested',
      'Canceled'
    ], 
    default: 'Pending' 
  },
  type: {
    type: String,
    enum: ['Online', 'ManualBlock'],
    default: 'Online'
  },
  totalPrice: { type: Number },
  paymentScreenshot: {
    type: String
  },
  advancePaid: { type: Number, default: 0 },
  refundBankName: { type: String },
  refundAccountTitle: { type: String },
  refundAccountNumber: { type: String },
  refundContactNumber: { type: String },
  refundTransactionId: { type: String },
  disputeReason: { type: String },
  rescheduleDetails: {
    date: String,
    startTime: String,
    endTime: String
  }
}, { timestamps: true });

// Optimize Database Lookups & Throughput under Heavy Traffic Load
bookingSchema.index({ user: 1, date: -1 });
bookingSchema.index({ court: 1, facility: 1, date: 1, status: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);