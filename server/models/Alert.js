const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const alertSchema = new Schema({
  message: { type: String, required: true },
  date: { type: Date, default: Date.now },
  seen: { type: Boolean, default: false },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  camera: { type: Schema.Types.ObjectId, ref: 'Camera', required: true },
  img: { 
    data: { type: Buffer },
    contentType: { type: String }
  },
});

module.exports = mongoose.model('Alert', alertSchema);
