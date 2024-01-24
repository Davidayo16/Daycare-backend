import mongoose from "mongoose";

const { Schema, model } = mongoose;

const enrollmentSchema = new Schema(
  {
    childDetails: {
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
      dateOfBirth: {
        type: Date,
        // required: true,
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
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        // required: true,
      },

      allergies: {
        type: [String],
        default: [],
      },
      medicalConditions: {
        type: [String],
        default: [],
      },
      profilePhoto: {
        type: String,
        default: "default.jpg", // Replace with your default image filename/path
      },
      // Add other necessary child details
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Parent", // Reference to the Parent model
      required: true,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
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

    typeOfProgram: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Processing Admission", "Admitted","Declined"], // Add other possible statuses
      default: "Processing Admission",
    },
    // Add any other fields relevant to the enrollment
  },
  { timestamps: true }
);

const Enrollment = model("Enrollment", enrollmentSchema);

export default Enrollment;
