// Import necessary modules and models
import express from "express";
import asyncHandler from "express-async-handler";
import Billing from "../Models/BillingSchema.js";
import { protect, protectChild, protectStaff } from "../Middleware/AuthMiddleware.js";

const billingRoute = express.Router();

// Route to fetch billing information based on child's ID
billingRoute.post(
  "/billing/history",
  protect,
  asyncHandler(async (req, res) => {
    const { childIds } = req.body;

    // Check if childIds array is provided
    if (!childIds || !Array.isArray(childIds) || childIds.length === 0) {
      res.status(400).json({ message: "Invalid child IDs provided" });
      return;
    }

    try {
      // Fetch billing information for each child ID
      const billingHistory = await Promise.all(
        childIds.map(async (childId) => {
          const billingInfo = await Billing.findOne({
            child: childId,
          }).populate("child");
          return billingInfo;
        })
      );
      console.log(billingHistory);
      res.status(200).json(billingHistory);
    } catch (error) {
      console.error("Error fetching billing history:", error);
      res.status(500).json({
        message: "Failed to fetch billing history",
        error: error.message,
      });
    }
  })
);

billingRoute.get(
  "/billing/:id",
  protectChild,
  asyncHandler(async (req, res) => {
    const childId = req.params.id;

    // Check if childId is provided
    if (!childId) {
      res.status(400).json({ message: "Invalid data provided" });
      return;
    }

    try {
      // Fetch billing information based on childId
      const billingInfo = await Billing.findOne({ child: childId });

      if (!billingInfo) {
        res.status(404).json({ message: "Billing information not found" });
        return;
      }

      res.status(200).json(billingInfo);
    } catch (error) {
      console.error("Error fetching billing information:", error);
      res.status(500).json({
        message: "Failed to fetch billing information",
        error: error.message,
      });
    }
  })
);

billingRoute.get(
  "/billingg/:id",
  protectStaff,
  asyncHandler(async (req, res) => {
    const childId = req.params.id;

    // Check if childId is provided
    if (!childId) {
      res.status(400).json({ message: "Invalid data provided" });
      return;
    }

    try {
      // Fetch billing information based on childId
      const billingInfo = await Billing.findOne({ child: childId });

      if (!billingInfo) {
        res.status(404).json({ message: "Billing information not found" });
        return;
      }

      res.status(200).json(billingInfo);
    } catch (error) {
      console.error("Error fetching billing information:", error);
      res.status(500).json({
        message: "Failed to fetch billing information",
        error: error.message,
      });
    }
  })
);

// Add a new route to fetch billing history for multiple children

export default billingRoute;
