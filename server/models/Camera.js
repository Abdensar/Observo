const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cameraSchema = new Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'offline'], default: 'active' },
  src: { type: String, required: true },
  features: {
    type: [String],
    enum: ['1','2','3'],
    default: []
  },
  user: { type: Schema.Types.ObjectId, ref: 'User' }, // owner
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Camera', cameraSchema);
