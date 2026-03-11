const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  monthlySalary: { type: Number, required: true },
  joiningDate: { type: Date, default: Date.now },
  advance: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  fine: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 }
});

module.exports = mongoose.model('Staff', staffSchema);