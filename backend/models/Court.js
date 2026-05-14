const mongoose = require('mongoose');

const reviewSchema = mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String, required: true }
}, { timestamps: true });

const subCourtDetailSchema = mongoose.Schema({
  name: { type: String, required: true },
  sport: { type: String, enum: ['Padel', 'Futsal', 'Cricket'], required: true },
  pricePerHour: { type: Number, required: true },
  hasPeakPricing: { type: Boolean, default: false },
  peakStartTime: { type: String },
  peakEndTime: { type: String },
  pricePeak: { type: Number }
});

const courtSchema = mongoose.Schema({
  name: { type: String, required: true }, 
  facilities: [{
    type: String,
    enum: ['Padel', 'Futsal', 'Cricket']
  }],
  courtsDetail: [subCourtDetailSchema],
  location: { type: String, default: 'Karachi, Pakistan' }, // New
  notificationEmail: { type: String }, // For manager notifications
  googleMapLink: { type: String }, // New
  paymentBank: { type: String },
  paymentAccountTitle: { type: String },
  paymentAccountNumber: { type: String },
  advanceRequired: { type: Number, default: 0 },
  operationalStartTime: { type: String, default: '00:00' },
  operationalEndTime: { type: String, default: '24:00' },
  pricePerHour: { type: Number, required: true }, // Base Off-Peak Price
  minSlots: { type: Number, default: 1 },
  discount: {
    percentage: { type: Number, default: 0 },
    validUntil: { type: Date },
    targetTier: { type: String, enum: ['both', 'base', 'peak'], default: 'both' }
  },
  peakStartTime: { type: String },
  peakEndTime: { type: String },
  pricePeak: { type: Number },
  description: { type: String },
  images: [{ type: String }], 
  amenities: [{ type: String }], 
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviews: [reviewSchema],
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 }
}, { timestamps: true });

courtSchema.path('facilities').validate(function (value) {
  return Array.isArray(value) && value.length > 0;
}, 'At least one facility is required.');

// Performance optimizations: Database Indexing for high-concurrency lookups
courtSchema.index({ facilities: 1 });
courtSchema.index({ name: 1 });
courtSchema.index({ manager: 1 });

module.exports = mongoose.model('Court', courtSchema);