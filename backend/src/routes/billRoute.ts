// initializeRegistrationPayment
import express from "express";
import { createBill, getUserBills } from "../controllers/billController"; // assuming you have auth middleware
import { protect, restrictTo } from "../controllers/authControllers";
import { UserRole } from "../models/userModel";

const router = express.Router();

router.post("/", protect, restrictTo(UserRole.Admin), createBill);
router.get("/",protect,getUserBills)

export default router;
