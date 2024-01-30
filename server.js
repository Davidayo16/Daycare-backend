import express from "express";
import dotenv from "dotenv";
import connectDatabase from "./Config/MongoDb.js";
import morgan from "morgan";
import cors from "cors";
import userRoute from "./Routes/UserRoute.js";
import attendanceRoute from "./Routes/AttendanceRoute.js";
import courseRoute from "./Routes/CourseRoute.js";
import { errorHandler, notFound } from "./Middleware/Error.js";
import billingRoute from "./Routes/BillingRoute.js";
import stripe from "stripe";
import Billing from "./Models/BillingSchema.js";
import { v4 as uuidv4 } from "uuid";
dotenv.config();

const app = express();

const corsOptions = {
  origin: [
    "https://daycare-app.onrender.com",
    "http://localhost:3000",
    "https://daycare-admin.onrender.com",
  ],
  // Add other CORS options as needed
};

app.use(cors(corsOptions));

app.use(morgan());
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/users", userRoute);
app.use("/api/attendance", attendanceRoute);
app.use("/api/courses", courseRoute);
app.use("/api/billing", billingRoute);

const validTokens = new Set();

function validateToken(token) {
  return validTokens.has(token);
}

function addValidToken(token) {
  validTokens.add(token);
}

const YOUR_DOMAIN = "http://localhost:3000"; // Update the port if your frontend is running on a different port

const stripeInstance = stripe(
  "sk_test_51NB3WiB17OYoDIw6mCnnfhsNGrDrHrItOJDQosyIfl1wAWnoeKVZgTj6EWvUi8C489kKBmxYklNFOulyGK9Fxfne00rOgbOhFy"
);
app.post("/create-checkout-session", async (req, res) => {
  const { billingId, booksFee, tuitionFee, activityFee } = req.body;

  const uniqueToken = uuidv4(); // Generate a unique token

  const session = await stripeInstance.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Registration Fees", // You can set this to whatever description you want
          },
          unit_amount: calculateTotalAmount(
            Number(booksFee),
            Number(tuitionFee),
            Number(activityFee)
          ),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    client_reference_id: billingId, // Pass the billing ID here
    success_url: `${process.env.REACT_APP_DOMAIN}/success/${uniqueToken}?billingId=${billingId}`,
    cancel_url: `${process.env.REACT_APP_DOMAIN}/cancel`,
  });

  console.log("Server response:", { id: session.id });
  res.json({ id: session.id });
});

app.get("/api/validate-token/:uniqueToken", (req, res) => {
  const { uniqueToken } = req.params;

  const isValidToken = validateToken(uniqueToken);

  if (isValidToken) {
    res.status(200).json({ valid: true });
  } else {
    res.status(403).json({ valid: false });
  }
});

function calculateTotalAmount(booksFee, tuitionFee, activityFee) {
  const totalAmount = (booksFee + tuitionFee + activityFee) * 100;

  // Ensure that the totalAmount is a valid integer
  if (isNaN(totalAmount) || totalAmount <= 0) {
    throw new Error("Invalid total amount");
  }

  return totalAmount;
}
const webhookUrl = process.env.REACT_APP_STRIPE_WEBHOOK_URL;
const endpointSecretLocal = process.env.REACT_APP_STRIPE_ENDPOINT_SECRET_LOCAL;
const endpointSecretProd = process.env.REACT_APP_STRIPE_ENDPOINT_SECRET_PROD;
// const endpointSecret =
//   "whsec_63939d4265110ae1d7f0b3b9ad73a055bf60e5ca30f48c01131807ae8e6e0517";

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    let event;
    // Only verify the event if you have an endpoint secret defined.
    // Otherwise use the basic event deserialized with JSON.parse
    if (endpointSecret) {
      // Get the signature sent by Stripe
      const signature = request.headers["stripe-signature"];
      try {
        event = stripe.webhooks.constructEvent(
          request.body,
          signature,
          webhookUrl === "http://localhost:3000/webhook"
            ? endpointSecretLocal
            : endpointSecretProd
        );
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        return response.sendStatus(400);
      }
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const billingId = session.client_reference_id;
      console.log(billingId);
      // Update your billing record in the database with the payment status
      await updateBillingStatus(billingId, true);
    }

    response.status(200).end();
  }
);

// Import your Billing model
// Adjust the path based on your project structure

async function updateBillingStatus(billingId, isPaid) {
  try {
    // Find the billing record by ID
    const billing = await Billing.findById(billingId);

    if (!billing) {
      // Billing record not found
      console.error(`Billing record with ID ${billingId} not found`);
      return;
    }

    // Update the isPaid status
    billing.isPaid = isPaid;

    // Save the updated billing record
    await billing.save();

    console.log(
      `Billing record with ID ${billingId} updated to isPaid=${isPaid}`
    );
  } catch (error) {
    console.error("Error updating billing status:", error);
    // Handle the error as needed
  }
}

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 1000;

const start = async () => {
  try {
    await connectDatabase(process.env.MONGO_URL);
    app.listen(PORT, console.log(`server is running on port ${PORT}.......`));
  } catch (error) {
    console.log(error);
  }
};
start();
