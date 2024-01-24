import mongoose from "mongoose";

const { Schema, model } = mongoose;

const attendanceSchema = new Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course", // Reference to the Course model
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Child", // Reference to the Student model (assuming you have a Student model)
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["present", "absent", "confirming"],
    default: "absent", // Assuming default status is 'absent'
  },
});

const Attendance = model("Attendance", attendanceSchema);

export default Attendance;
