import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Define the billing schema
const billingSchema = new Schema(
  {
    child: {
      type: Schema.Types.ObjectId,
      ref: "Child",
      required: true,
    },
    booksFee: {
      type: Number,
      default: 50, // Sample value, replace it with your actual fee structure
    },
    tuitionFee: {
      type: Number,
      default: 200, // Sample value, replace it with your actual fee structure
    },
    activityFee: {
      type: Number,
      default: 30, // Sample value, replace it with your actual fee structure
    },
    dueDate: {
      type: Date,
      required: true,
    },
    session: {
      type: String,
      required: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paymentDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);


const Billing = model("Billing", billingSchema);

export default Billing;
