import express from "express";
// import Course from "./models/Course.js"; // Import the Course model or schema
import Course from "./../Models/Courses.js";
import { protectChild } from "../Middleware/AuthMiddleware.js";
import moment from "moment";
import asyncHandler from "express-async-handler";
const courseRoute = express.Router();

courseRoute.get("/courses", async (req, res) => {
  try {
    const courses = await Course.find();
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

courseRoute.get(
  "/courses-for-current-day",
  protectChild,
  asyncHandler(async (req, res) => {
    try {
      const currentDay = moment().format("dddd"); // Get the current day name (e.g., 'Monday')

      const coursesForDay = await Course.find({ schedule: currentDay });

      if (!coursesForDay.length) {
        const nextAvailableDay = moment().add(1, "days").format("dddd");
        const nextDayCourses = await Course.find({
          schedule: nextAvailableDay,
        });

        throw new Error(
          `No courses scheduled for today. Showing courses for ${nextAvailableDay}.`
        );
      } else {
        res
          .status(200)
          .json({ courses: coursesForDay, message: `${currentDay}s Courses` });
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      throw new Error("Failed to fetch courses");
    }
  })
);


// Route to create a new course
courseRoute.post(
  "/create-course",
  protectChild,
  asyncHandler(async (req, res) => {
    try {
      const {
        name,
        schedule,
        instructor,
        description,
        location,
        startTime,
        endTime,
      } = req.body;

      // Convert the name to lowercase
      const lowercaseName = name.toLowerCase();

      // Check if a course with the same lowercase name already exists
      const existingCourse = await Course.findOne({ name: lowercaseName });

      if (existingCourse) {
        throw new Error("A course with the same name already exists");
      }

      // Create and save the new course
      const newCourse = new Course({
        name: lowercaseName,
        schedule,
        instructor,
        description,
        location,
        startTime,
        endTime,
        // Add other fields if needed based on your schema
      });

      const savedCourse = await newCourse.save();

      res
        .status(201)
        .json({ message: "Course created successfully", course: savedCourse });
    } catch (error) {
      console.error("Error creating course:", error);
      throw new Error("Failed to create course");
    }
  })
);


export default courseRoute;
