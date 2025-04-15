import express from "express";
import {
  getAllUsers,
  getMe,
  login,
  protect,
  signup,
  verifyEmail,
  verifyOtp,
} from "../controllers/authControllers";
const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/verify/otp", verifyOtp);
router.get("/me", protect, getMe);
router.get("/verify-email/:token", verifyEmail);
router.get("/users", getAllUsers);

export default router;
