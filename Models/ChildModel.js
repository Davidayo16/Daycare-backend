import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
const childSchema = new mongoose.Schema(
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
    },
    password: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      default: new Date("1900-01-01"), // Example: Setting a default date in the past
    },
    gender: {
      type: String,
      default: "Not Specified",
    },
    gender: {
      type: String,
    },
    address: {
      type: String,
      // required: true,
    },
    city: {
      type: String,
      // required: true,
    },
    state: {
      type: String,
      // required: true,
    },
    country: {
      type: String,
      // required: true,
    },

    typeOfProgram: {
      type: String,
      // required: true,
    },
    authorizedPickupPersons: [
      {
        fullName: {
          type: String,
          required: true,
        },
        relationship: {
          type: String,
          required: true,
        },
        contactInfo: {
          type: String,
          required: true,
        },
        // Add any other necessary fields for authorizedPickupPersons
      },
    ],
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent", // Reference to the Student model (assuming you have a Student model)
      required: true,
    },
    allergies: [String],
    medicalConditions: [String],
    // Add other fields relevant to the Child model
  },
  { timestamps: true }
);

childSchema.methods.matchPassword = async function (enterPassword) {
  return await bcrypt.compare(enterPassword, this.password);
};
childSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
const Child = mongoose.model("Child", childSchema);

export default Child;
