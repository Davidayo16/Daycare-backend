import express from "express";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import generateToken from "./../Utils/GenerateToken.js";
import {
  protect,
  protectChild,
  protectStaff,
} from "../Middleware/AuthMiddleware.js";

import Parent from "../Models/ParentModel.js";
import Child from "../Models/ChildModel.js";
import Enrollment from "../Models/Enrollment.js";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { Task, Schedule, Staff } from "../Models/StaffModel.js";
import Billing from "../Models/BillingSchema.js";

const userRoute = express.Router();

// Register Parent
userRoute.post(
  "/parent-register",
  asyncHandler(async (req, res) => {
    const { email, lastName, firstName, password } = req.body;
    console.log(req.body);
    if (!email || !password || !firstName || !lastName) {
      res.status(400);
      throw new Error("please add all fields");
    }
    const userExist = await Parent.findOne({ email });
    if (userExist) {
      res.status(400);
      throw new Error("User already exist");
    }
    const user = await Parent.create({
      email,
      firstName,
      lastName,
      password,
    });
    res.status(201).json({
      _id: user._id,
      name: user.firstName,
      email: user.lastName,
      token: generateToken(user._id),
      createdAt: user.createdAt,
    });
  })
);

// ****Login Parent
userRoute.post(
  "/parent-login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await Parent.findOne({ email });
    if (!email || !password) {
      throw new Error("Please fill all fields");
    }

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastname: user.lastName,
        email: user.email,
        token: generateToken(user._id),
        createdAt: user.createdAt,
      });
    } else {
      res.status(401);
      throw new Error("Invalid credentials");
    }
  })
);

// *** ENROLL CHILD
userRoute.post(
  "/enroll",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const {
        childDetails,
        enrollmentDate,
        authorizedPickupPersons,
        typeOfProgram,
      } = req.body;

      // Check if there's an existing enrollment with the same email
      const existingEnrollment = await Enrollment.findOne({
        "childDetails.email": childDetails.email,
      });

      if (existingEnrollment) {
        throw new Error("Child already enrolled with this email");
      }

      // If no existing enrollment, create a new one
      const newEnrollment = await Enrollment.create({
        childDetails,
        enrollmentDate,
        authorizedPickupPersons,
        typeOfProgram,
        parent: req.parent._id,
      });

      res.status(201).json({
        message: "Enrollment submitted. Processing admission...",
        enrollment: newEnrollment,
      });
    } catch (error) {
      console.error(error);
      throw new Error("Server Error");
    }
  })
);

//***GET ENROLLMENT */
userRoute.get(
  "/enrollments",
  protect,
  asyncHandler(async (req, res) => {
    try {
      // Find enrollments by parent's reference
      const enrollments = await Enrollment.find({
        parent: req.parent._id,
      });

      if (!enrollments || enrollments.length === 0) {
        throw new Error("No enrollments found for this parent");
      }

      res.status(200).json(enrollments);
    } catch (error) {
      console.error(error);
      throw new Error("Server Error");
    }
  })
);

// Your OAuth2 credentials
const CLIENT_ID =
  "625791571147-f4euvilkl1hmbfbi4vos40c4e95nc9h6.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "https://developers.google.com/oauthplayground";
const REFRESH_TOKEN =
  "1//04xqqh1_ZUSmwCgYIARAAGAQSNwF-L9Ir18noeyykiynFzclcGLEe_ZTMlR88ZWEcemv4-wC0lYFAJeFGVW86MWsLsK7Vm-NSWcc";

// Initialize OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Function to refresh the access token
const refreshAccessToken = async () => {
  try {
    const { tokens } = await oAuth2Client.refreshToken(REFRESH_TOKEN);
    oAuth2Client.setCredentials(tokens);
    console.log("Access token refreshed successfully.");
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw new Error("Failed to refresh access token.");
  }
};

// Function to check token expiration and refresh if necessary
const checkAndRefreshToken = async () => {
  try {
    const accessToken = oAuth2Client.getAccessToken();
    const expiryDate = oAuth2Client.credentials.expiry_date;
    const currentTime = new Date().getTime();

    // Refresh token if it's close to expiry or has already expired
    if (!accessToken || (expiryDate && currentTime >= expiryDate - 60000)) {
      await refreshAccessToken();
    }
  } catch (error) {
    console.error("Error checking or refreshing token:", error);
    throw new Error("Failed to check or refresh token.");
  }
};

// Function to set OAuth2 credentials with token refresh logic
const setOAuthCredentials = async () => {
  try {
    await oAuth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN,
    });
    console.log("OAuth credentials set successfully.");
  } catch (error) {
    console.error("Error setting OAuth credentials:", error);
    throw new Error("Failed to set OAuth credentials.");
  }
};

// Function to send email
const sendEmail = async (toEmail, subject, text) => {
  try {
    await setOAuthCredentials(); // Ensure OAuth credentials are set before sending emails

    await checkAndRefreshToken(); // Check and refresh token if needed

    const accessToken = await oAuth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: "davidodimayo7@gmail.com",
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });

    const mailOptions = {
      from: "davidodimayo7@gmail.com",
      to: "idowuodimayo@gmail.com",
      subject: subject,
      text: text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email.");
  }
};

// ****** GIVE ADMISSION *****
userRoute.put(
  "/enrollment/:id/status",
  protectStaff,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { newStatus } = req.body;

    try {
      await setOAuthCredentials(); // Ensure OAuth credentials are set before fetching data

      const enrollment = await Enrollment.findById(id).populate("parent");

      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }

      enrollment.status = newStatus;
      await enrollment.save();
      const email = enrollment.childDetails.email;

      if (newStatus === "Admitted") {
        const userExist = await Child.findOne({ email });

        if (userExist) {
          throw new Error("User already exists");
        }

        const newPassword = generatePassword(); // Generate a password

        // Find parent details using the email
        const parent = await Parent.findOne({ email: enrollment.parent.email });

        if (!parent) {
          throw new Error("Parent not found");
        }

        // Create a new Child with the parent's ID
        const childProfile = await Child.create({
          email: enrollment.childDetails.email,
          lastName: enrollment.childDetails.lastName,
          firstName: enrollment.childDetails.firstName,
          city: enrollment.childDetails.firstName,
          state: enrollment.childDetails.state,
          country: enrollment.childDetails.country,
          dateOfBirth: enrollment.childDetails.dateOfBirth,
          allergies: [...enrollment.childDetails.allergies],
          medicalConditions: [...enrollment.childDetails.medicalConditions],
          authorizedPickupPersons: enrollment.authorizedPickupPersons,
          password: newPassword,
          typeOfProgram: enrollment.typeOfProgram,
          parent: parent._id, // Assign the parent ID
          // Other child details from enrollment
        });

        // Update the parent's 'children' array with the new child's ID
        parent.children.push(childProfile._id);
        await parent.save();

        // Create billing record
        await Billing.create({
          child: childProfile._id,
          dueDate: new Date("01/30/2024"), // Format as MM/DD/YYYY
          session: 2024,
          // Set other billing details as needed
          // ...
        });

        // Send admission email to the parent
        const mailText = `Dear ${parent.firstName},\n\nYour child has been admitted. Their account has been created with the following details:\n\nEmail: ${email}\nPassword: ${newPassword}\n\nPlease log in to your account to manage your child's activities.\n\nThank you.`;

        await sendEmail(
          enrollment.parent.email,
          "Admission Notification",
          mailText
        );

        return res.status(201).json({
          _id: childProfile._id,
          firstName: childProfile.firstName,
          lastName: childProfile.lastName,
          email: childProfile.email,
          token: generateToken(childProfile._id),
          createdAt: childProfile.createdAt,
          message: "Child admitted. Email sent to parent with child details.",
        });
      }

      res
        .status(200)
        .json({ message: "Enrollment status updated successfully" });
    } catch (error) {
      console.error(error);
      throw new Error("Server Error");
    }
  })
);

function generatePassword(length = 10) {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+";

  let password = "";
  for (let i = 0; i < length; ++i) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}

// *** PARENT PROFILE
// Get Parent Details
userRoute.get(
  "/parent-profile",
  protect,
  asyncHandler(async (req, res) => {
    const user = await Parent.findById(req.parent._id).populate("children");

    if (user) {
      res.json({ user });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

// ***** UPDATE PARENT PROFILE
userRoute.put(
  "/parent-profile",
  protect, // Your authentication middleware
  asyncHandler(async (req, res) => {
    const updateFields = req.body; // Fields to update sent in the request body

    try {
      const parent = await Parent.findById(req.parent._id);

      if (!parent) {
        res.status(404);
        throw new Error("Parent not found");
      }

      // Update parent profile fields dynamically based on the request body
      Object.keys(updateFields).forEach((key) => {
        if (updateFields[key]) {
          parent[key] = updateFields[key];
        }
      });

      const updateUser = await parent.save();
      res.json({
        _id: updateUser._id,
        name: updateUser.name,
        email: updateUser.email,

        token: generateToken(updateUser._id),
        createdAt: updateUser.createdAt,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  })
);

// ****Login Child
userRoute.post(
  "/child-login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await Child.findOne({ email });
    if (!email || !password) {
      throw new Error("Please fill all fields");
    }

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        token: generateToken(user._id),
        createdAt: user.createdAt,
      });
    } else {
      res.status(401);
      throw new Error("Invalid credentials");
    }
  })
);

// **** GET ALL CHILDREN ****
userRoute.get(
  "/child",
  protectStaff,
  asyncHandler(async (req, res) => {
    const user = await Child.find().populate("parent");
    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

// ****GET ALL ENROLLMENTS ***
userRoute.get(
  "/enrollmentss",

  protectStaff,
  asyncHandler(async (req, res) => {
    try {
      // Find enrollments by parent's reference
      const enrollments = await Enrollment.find();

      if (!enrollments || enrollments.length === 0) {
        throw new Error("No enrollments found for this parent");
      }

      res.status(200).json(enrollments);
    } catch (error) {
      console.error(error);
      throw new Error("Server Error");
    }
  })
);

userRoute.get(
  "/enrollments/:id",

  protectStaff,
  asyncHandler(async (req, res) => {
    try {
      // Find enrollments by parent's reference

      const enrollments = await Enrollment.findById(req.params.id);

      if (!enrollments || enrollments.length === 0) {
        throw new Error("No enrollments found for this parent");
      }

      res.status(200).json(enrollments);
    } catch (error) {
      console.error(error);
      throw new Error("Server Error");
    }
  })
);

// ***** GET ALL PARENT ****
userRoute.get(
  "/parent",

  protectStaff,
  asyncHandler(async (req, res) => {
    const user = await Parent.find().populate("children");
    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

userRoute.get(
  "/parent/:id",

  protectStaff,
  asyncHandler(async (req, res) => {
    const user = await Parent.findById(req?.params.id).populate("children");
    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

// ***** GET ALL STAFF ****
userRoute.get(
  "/staff",

  protectStaff,
  asyncHandler(async (req, res) => {
    const user = await Staff.find();
    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

// ***CHILD PROFILE

userRoute.get(
  "/child-profile",
  protectChild,
  asyncHandler(async (req, res) => {
    const user = await Child.findById(req.child._id).populate("parent");
    if (user) {
      res.json({ user });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

userRoute.get(
  "/child-profile/:id",
  asyncHandler(async (req, res) => {
    const user = await Child.findById(req.params.id).populate("parent");
    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

const deleteChild = async (req, res, next) => {
  try {
    const result = await Child.deleteOne({ _id: req.params.id });

    if (result.deletedCount === 1) {
      res.json({ message: "User removed successfully" });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    next(error);
  }
};

// Route definition
userRoute.delete(
  "/child-profile/:id",

  protectStaff,
  asyncHandler(deleteChild)
);

userRoute.get(
  "/parent-profile/:id",

  protectStaff,
  asyncHandler(async (req, res) => {
    const user = await Parent.findById(req.params.id).populate("children");
    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

const deleteParent = async (req, res, next) => {
  try {
    const result = await Parent.deleteOne({ _id: req.params.id });

    if (result.deletedCount === 1) {
      res.json({ message: "User removed successfully" });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    next(error);
  }
};

// Route definition
userRoute.delete(
  "/parent-profile/:id",

  protectStaff,
  asyncHandler(deleteParent)
);

const deleteStaff = async (req, res, next) => {
  try {
    const result = await Staff.deleteOne({ _id: req.params.id });

    if (result.deletedCount === 1) {
      res.json({ message: "User removed successfully" });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    next(error);
  }
};

// Route definition
userRoute.delete(
  "/staff-profile/:id",

  protectStaff,
  asyncHandler(deleteStaff)
);

userRoute.get(
  "/child-profile",
  protectChild,
  asyncHandler(async (req, res) => {
    const user = await Child.findById(req.child._id).populate("parent");
    if (user) {
      res.json({ user });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);
// Update Child Profile
userRoute.put(
  "/child-profile",
  protectChild, // Your authentication middleware
  asyncHandler(async (req, res) => {
    const updateFields = req.body; // Fields to update sent in the request body

    try {
      const child = await Child.findById(req.child._id);

      if (!child) {
        res.status(404);
        throw new Error("Child not found");
      }

      // Update parent profile fields dynamically based on the request body
      Object.keys(updateFields).forEach((key) => {
        if (key === "allergies" || key === "medicalConditions") {
          // If the key is allergies or medicalConditions and it's an array, push its contents
          if (Array.isArray(updateFields[key])) {
            child[key].push(...updateFields[key]);
          }
        } else {
          // For other fields, update normally
          if (updateFields[key]) {
            child[key] = updateFields[key];
          }
        }
      });

      const updateUser = await child.save();
      res.json({
        _id: updateUser._id,
        name: updateUser.name,
        email: updateUser.email,
        firstName: updateUser.firstName,
        lastName: updateUser.lastName,
        // password: updateUser.email,
        token: generateToken(updateUser._id),
        createdAt: updateUser.createdAt,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  })
);

userRoute.put(
  "/child-profile/delete",
  protectChild, // Your authentication middleware
  asyncHandler(async (req, res) => {
    const { field, index } = req.body; // Field to delete and index sent in the request body

    try {
      const child = await Child.findById(req?.child?._id);

      if (!child) {
        res.status(404);
        throw new Error("Child not found");
      }

      // Handle deletion based on the field and index
      if (field === "allergies" || field === "medicalConditions") {
        if (Array.isArray(child[field])) {
          child[field].splice(index, 1);
        }
      } else {
        res.status(400);
        throw new Error("Invalid field");
      }

      const updateUser = await child.save();
      res.json({
        _id: updateUser._id,
        name: updateUser.name,
        email: updateUser.email,
        token: generateToken(updateUser._id),
        createdAt: updateUser.createdAt,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  })
);

// *******Register Staff
userRoute.post(
  "/staff-register",
  asyncHandler(async (req, res) => {
    try {
      const { email, lastName, firstName, password, position, department } =
        req.body;

      if (
        !email ||
        !password ||
        !firstName ||
        !lastName ||
        !position || // Fix: Check if position is missing
        !department // Fix: Check if department is missing
      ) {
        res.status(400);
        throw new Error("Please add all fields");
      }

      const userExist = await Staff.findOne({ email });

      if (userExist) {
        res.status(400);
        throw new Error("User already exists");
      }

      const user = await Staff.create({
        email,
        firstName,
        lastName,
        password,
        department,
        position,
        isAdmin
      });

      res.status(201).json({
        _id: user._id,
        name: user.firstName,
        email: user.lastName,
        position: user.position, // Fix: Corrected property names
        department: user.department, // Fix: Corrected property names
        token: generateToken(user._id),
        createdAt: user.createdAt,
      });
    } catch (error) {
      res.status(500);
      console.error(error);
      throw new Error("Server Error", error.message);
    }
  })
);

// ****Login Staff
userRoute.post(
  "/staff-login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await Staff.findOne({ email });
    if (!email || !password) {
      throw new Error("Please fill all fields");
    }

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        token: generateToken(user._id),
        isAdmin:user.isAdmin,
        createdAt: user.createdAt,
      });
    } else {
      res.status(401);
      throw new Error("Invalid credentials");
    }
  })
);

// ***** STAFF PROFILE
userRoute.get(
  "/staff-profile",
  protectStaff,
  asyncHandler(async (req, res) => {
    const staffId = req.staff._id;
    const user = await Staff.findById(staffId).populate("tasks").populate("");
    if (user) {
      res.json({ user });
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  })
);

// ***** CREATE TASK *****
userRoute.post(
  "/create-task/:staffId",
  asyncHandler(async (req, res) => {
    const { description, deadline, progress } = req.body;
    const staffId = req.params.staffId;

    // Check if staffId is provided
    if (!staffId) {
      throw new Error("Staff ID is required");
    }

    // Check if the staff member exists
    const staffMember = await Staff.findById(staffId);

    if (!staffMember) {
      throw new Error("Staff member not found");
    }

    // Create a new task
    const newTask = new Task({
      description,
      deadline,
      progress,
      staff: staffId, // Assign the task to the specific staff member
    });

    // Save the task
    const savedTask = await newTask.save();

    // Update the staff member's tasks array with the new task
    staffMember.tasks.push(savedTask._id);
    await staffMember.save();

    res.status(201).json({
      message: "Task created and assigned successfully",
      task: savedTask,
    });
  })
);

// ***** CREATE SCHEDULE ******
userRoute.post(
  "/create-schedule/:staffId",
  asyncHandler(async (req, res) => {
    const { day, startTime, endTime } = req.body;
    const { staffId } = req.params;

    // Check if staffId is provided
    if (!staffId) {
      throw new Error("Staff ID is required");
    }

    // Check if the staff member exists
    const staffMember = await Staff.findById(staffId);

    if (!staffMember) {
      throw new Error("Staff member not found");
    }

    // Create a new schedule entry
    const newSchedule = new Schedule({
      day,
      startTime,
      endTime,
      staff: staffId, // Assign the schedule entry to the specific staff member
    });

    // Save the schedule entry
    const savedSchedule = await newSchedule.save();

    // Update the staff member's schedule array with the new schedule entry
    staffMember.schedule.push(savedSchedule._id);
    await staffMember.save();

    res.status(201).json({
      message: "Schedule created and assigned successfully",
      schedule: savedSchedule,
    });
  })
);

// Get all Users

// Forgotten password
userRoute.post(
  "/forgot-password-token",
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      try {
        const token = await user.createPasswordResetToken();
        await user.save();
        const resetUrl = `Hi, please follow this link to reset your password<a href='http://localhost:5000/api/users/reset-password/${token}'>Click Here</a>`;
        const data = {
          to: email,
          text: "Hey user",
          subject: "Forgot password link",
          htm: resetUrl,
        };
        sendEmail(data);
        console.log(sendEmail(data));
        res.json(token);
      } catch (error) {
        throw new Error(error);
      }
    } else {
      throw new Error("user not found");
    }
  })
);

// Reset password
userRoute.get(
  "/rest-password",
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = User.findOne({ email });
    if (user) {
      try {
        const token = await user.createPasswordResetToken();
        await user.save();
        const resetUrl = `Hi, please follow this link to reset your password<a href='http://localhost:5000/api/user/reset-password/${token}'>Click Here</a>`;
        const data = {
          to: email,
          text: "Hey user",
          subject: "Forgot password link",
          htm: resetUrl,
        };
      } catch (error) {}
    }
  })
);

export default userRoute;
