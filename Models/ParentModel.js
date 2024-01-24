import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const parentSchema = new mongoose.Schema(
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
    },
    password: {
      type: String,
      required: true,
    },
    contact: {
      type: String,
      default: "Not Specified",
    },
    homeAddress: {
      type: String,
      default: "Not Specified",
    },
    workAddress: {
      type: String,
      default: "Not Specified",
    },
    gender: {
      type: String,
      default: "Not Specified",
    },
    relationship: {
      type: String,
      default: "Parent",
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Child", // Reference to the Child model
      },
    ],
 

    emergencyContacts: [
      {
        name: String,
        relationship: String,
        phone: String,
        // Add more fields for emergency contacts as needed
      },
    ],
    // Add any other fields relevant to the Parent model
  },
  { timestamps: true }
);
parentSchema.methods.matchPassword = async function (enterPassword) {
  return await bcrypt.compare(enterPassword, this.password);
};
parentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
const Parent = mongoose.model("Parent", parentSchema);

export default Parent;
