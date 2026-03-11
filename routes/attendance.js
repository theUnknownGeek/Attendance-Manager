const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

router.get('/month/:month', async (req, res) => {
  try {
    const records = await Attendance.find({
      date: { $regex: `^${req.params.month}` }
    }).populate('staffId');
    res.json(records);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { staffId, date, status } = req.body;
    const record = await Attendance.findOneAndUpdate(
      { staffId, date },
      { status },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:staffId/:month', async (req, res) => {
  try {
    const { staffId, month } = req.params;
    const records = await Attendance.find({
      staffId,
      date: { $regex: `^${month}` }
    });
    res.json(records);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;