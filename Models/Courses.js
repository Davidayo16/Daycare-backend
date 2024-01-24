import mongoose from "mongoose";

const { Schema, model } = mongoose;

const courseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    schedule: [
      {
        type: String,
        enum: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
    ],
    instructor: {
      type: String,
   
    },
    location: {
      type: String,
    },
    startTime: {
      type: String,
    },
    endTime: {
      type: String,
    },
    // Other fields related to the course
  },
  { timestamps: true }
);

const Course = model("Course", courseSchema);

export default Course;
