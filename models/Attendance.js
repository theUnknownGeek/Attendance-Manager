const mongoose=require('mongoose');

const attendanceSchema = new mongoose.Schema({
    staffId: {type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true},
    date: {type: String, required: true},
    status: {type: String, enum: ['Present', 'Absent', 'Half-Day'], required: true}
});

module.exports=mongoose.model('Attendance', attendanceSchema);