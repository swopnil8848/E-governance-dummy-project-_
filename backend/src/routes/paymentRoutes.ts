// initializeRegistrationPayment
import express from "express";
import { protect } from "../controllers/authControllers"; // assuming you have auth middleware
import {
  initializeRegistrationPayment,
  stripe_initializeBillPayment,
  stripe_initializeRegistrationPayment,
  stripe_verifyPayment,
} from "../controllers/paymentControllers";

const router = express.Router();

// Create registration request
router.post(
  "/registrations/:registrationId",
  protect,
  initializeRegistrationPayment
);

router.post(
  "/stripe/registrations/:registrationId",
  protect,
  stripe_initializeRegistrationPayment
);
router.post("/stripe/bills/:billId", protect, stripe_initializeBillPayment);
router.get("/stripe/verify", protect, stripe_verifyPayment);

export default router;
