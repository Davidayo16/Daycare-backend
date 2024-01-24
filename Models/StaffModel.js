import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema, model } = mongoose;

const staffProfileSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      // You might want to hash the password before saving it
    },
    position: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },
    tasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ], // Array of tasks
    schedule: [
      {
        type: Schema.Types.ObjectId,
        ref: "Schedule",
      },
    ], // Array of schedule entries
    // You can add more fields as needed (e.g., contactInfo, address, etc.)
  },
  {
    timestamps: true,
  }
);

const taskSchema = new Schema({
  description: { type: String, required: true },
  deadline: { type: Date, required: true },
  progress: {
    type: String,
    enum: ["in progress", "not started", "completed"],
    default: "not started",
  },
  staff: {
    type: Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },
});

const scheduleSchema = new Schema({
  day: {
    type: String,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  staff: {
    type: Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },
});

staffProfileSchema.methods.matchPassword = async function (enterPassword) {
  return await bcrypt.compare(enterPassword, this.password);
};
staffProfileSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const Staff = model("Staff", staffProfileSchema);
const Task = model("Task", taskSchema);
const Schedule = model("Schedule", scheduleSchema);

export { Staff, Task, Schedule };
