import express from "express";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import generateToken from "./../Utils/GenerateToken.js";
import { protect, protectChild, protectStaff } from "../Middleware/AuthMiddleware.js";
import moment from "moment";
import Parent from "../Models/ParentModel.js";
import Child from "../Models/ChildModel.js";
import Enrollment from "../Models/Enrollment.js";
import Attendance from "./../Models/Attendance.js";
import cron from "node-cron";
import Course from "../Models/Courses.js";
const attendanceRoute = express.Router();
// ... (other imports and setup)

attendanceRoute.post(
  "/mark-attendance/:courseId",
  protectChild,
  asyncHandler(async (req, res) => {
    try {
      const { courseId } = req.params;
      const { status } = req.body;
      const studentId = req?.child?._id;

      // Check if the courseId, status, and studentId are provided
      if (!courseId || !status || !studentId) {
        throw new Error("Invalid data provided");
      }

      // Check if the course exists and is scheduled for the current day
      const currentDate = new Date();
      const currentDay = moment().format("dddd");
      const courseForDay = await Course.findOne({
        _id: courseId,
        schedule: currentDay,
      });

      if (!courseForDay) {
        throw new Error("Course not found for today");
      }

      // Check if attendance for the course, student, and the current day exists
      const existingAttendance = await Attendance.findOne({
        courseId,
        studentId,
        date: {
          $gte: moment().startOf("day").toDate(),
          $lt: moment().endOf("day").toDate(),
        },
      }).populate("courseId"); // Populate the course details

      if (existingAttendance) {
        throw new Error("Attendance already marked for today by this student");
      }

      // Create attendance entry for the student and course on the current day
      const newAttendance = new Attendance({
        courseId,
        studentId,
        status,
        date: currentDate,
      });
      await newAttendance.save();

      // Populate the course details for the newAttendance
      const populatedNewAttendance = await Attendance.findById(
        newAttendance._id
      ).populate("courseId");

      res.status(201).json({
        message: "Attendance marked successfully",
        attendance: populatedNewAttendance, // Include attendance details with course
      });
    } catch (error) {
      console.error("Error marking attendance:", error);
      throw new Error("Failed to mark attendance");
    }
  })
);

const x = cron.schedule("* * * * *", async () => {
  try {
    const currentDate = new Date();
    const currentDay = moment().format("dddd");

    // Find courses scheduled for the current day
    const coursesForDay = await Course.find({
      schedule: currentDay,
    });

    // Iterate through courses and mark attendance for past courses
    for (const course of coursesForDay) {
      const endTime = moment(course.endTime, "HH:mm");

      if (moment().isAfter(endTime)) {
        // Mark attendance as absent for past courses
        const attendance = new Attendance({
          courseId: course._id,
          studentId: "yourStudentId", // Replace with actual student ID
          status: "absent",
          date: currentDate,
        });
        await attendance.save();
      }
    }
  } catch (error) {
    console.error("Error marking attendance:", error);
  }
});

// Start the cron job
x.start();

attendanceRoute.get(
  "/attendance-history",
  protectChild,
  asyncHandler(async (req, res) => {
    try {
      const childId = req?.child?._id;

      // Check if the childId is provided
      if (!childId) {
        throw new Error("Invalid data provided");
      }

      // Fetch attendance records based on the childId and populate the 'courseId' field
      const attendanceHistory = await Attendance.find({
        studentId: childId,
      }).populate("courseId");

      res.status(200).json({ attendanceHistory });
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      throw new Error("Failed to fetch attendance history");
    }
  })
);

// Route to get attendance status for a specific course
attendanceRoute.get(
  "/attendance-status/:courseId",
  protectChild,
  asyncHandler(async (req, res) => {
    try {
      const { courseId } = req.params;
      const studentId = req?.child?._id; // Assuming you have authentication middleware
      const currentDate = moment().startOf("day");
      const nextDate = moment().endOf("day");

      console.log("Debugging: courseId", courseId);
      console.log("Debugging: studentId", studentId);
      console.log("Debugging: currentDate", currentDate);
      console.log("Debugging: nextDate", nextDate);

      // Check if attendance for the course and student exists on the current day
      const existingAttendance = await Attendance.findOne({
        courseId,
        studentId,
        date: {
          $gte: currentDate.toDate(),
          $lt: nextDate.toDate(),
        },
      });

      console.log("Debugging: existingAttendance", existingAttendance);

      if (existingAttendance) {
        res.status(200).json({ status: existingAttendance.status });
      } else {
        res.status(200).json({ status: "absent" }); // If attendance does not exist, consider it as not marked
      }
    } catch (error) {
      console.error("Error fetching attendance status:", error);
      throw new Error("Failed to fetch attendance status");
    }
  })
);

attendanceRoute.put(
  "/update-attendance-status/:attendanceId",
protectStaff,
  asyncHandler(async (req, res) => {
    try {
      const { attendanceId } = req.params;
      const { studentId } = req?.body;

      // Check if the attendanceId and studentId are provided
      if (!attendanceId || !studentId) {
        throw new Error("Invalid data provided");
      }

      // Check if the attendance exists and belongs to the student
      const existingAttendance = await Attendance.findOne({
        _id: attendanceId,
        studentId,
      });

      if (!existingAttendance) {
        throw new Error("Attendance not found");
      }

      // Update the status of the attendance (e.g., toggle between present and absent)
      existingAttendance.status =
        existingAttendance.status === "present" ? "absent" : "present";
      await existingAttendance.save();

      res.status(200).json({
        message: "Attendance status updated successfully",
        updatedAttendance: existingAttendance,
      });
    } catch (error) {
      console.error("Error updating attendance status:", error);
      throw new Error("Failed to update attendance status");
    }
  })
);

attendanceRoute.get(
  "/attendance-historyy/:id",
  protectStaff,
  asyncHandler(async (req, res) => {
    try {
      const childId = req?.params.id;

      // Check if the childId is provided
      if (!childId) {
        throw new Error("Invalid data provided");
      }

      // Fetch attendance records based on the childId and populate the 'courseId' field
      const attendanceHistory = await Attendance.find({
        studentId: childId,
      }).populate("courseId");

      res.status(200).json({ attendanceHistory });
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      throw new Error("Failed to fetch attendance history");
    }
  })
);
export default attendanceRoute;
