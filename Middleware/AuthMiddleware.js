import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import Parent from "../Models/ParentModel.js";
import Child from "../Models/ChildModel.js";
import { Staff } from "../Models/StaffModel.js";

// Middleware for protecting routes accessible only to parents
export const protect = asyncHandler(async (req, res, next) => {
  let token;
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.parent = await Parent.findById(decoded.id).select("-password");
      next();
    } else {
      throw new Error("Not Authorized, no token provided");
    }
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "Not Authorized", error: error.message });
  }
});

// Middleware for protecting routes accessible only to children
export const protectChild = asyncHandler(async (req, res, next) => {
  let token;
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.child = await Child.findById(decoded.id).select("-password");
      next();
    } else {
      throw new Error("Not Authorized, no token provided");
    }
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "Not Authorized", error: error.message });
  }
});


export const protectStaff = asyncHandler(async (req, res, next) => {
  let token;
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.staff = await Staff.findById(decoded.id).select("-password");
      next();
    } else {
      throw new Error("Not Authorized, no token provided");
    }
  } catch (error) {
    console.log(error);
    res.status(401).json({ message: "Not Authorized", error: error.message });
  }
});