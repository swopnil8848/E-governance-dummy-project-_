import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/database";
import logger from "./utils/logger";
import httpLogger from "./utils/httpLogger";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import "./types/global";
import authRouter from "./routes/authRoutes";
import registrationRoutes from "./routes/registrationRoute";
import paymentRoutes from "./routes/paymentRoutes";
import billRoutes from "./routes/billRoute";
import { globalErrorHandler } from "./controllers/errorController";

dotenv.config();

connectDB().catch((err) => {
  logger.error("Database connection error:", err);
  process.exit(1);
});

const app = express();

app.use(httpLogger);

app.use(
  cors({
    origin: [
      "https://swopnil.ekrasunya.com",
      "http://localhost:5173", // Your local development URL
    ],
    credentials: true, // This is important for cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRouter);
app.use("/api/registrations", registrationRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/bills", billRoutes);

app.use(globalErrorHandler);

// app.all(/.*/, (req, res, next) => {
//   console.log("route called");
//   next(new Error(`cant find ${req.originalUrl} on this server`));
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(
    `Server running on port ${PORT} in ${
      process.env.NODE_ENV || "development"
    } mode`
  );
});

// Handle uncaught exceptions
// process.on("uncaughtException", (err) => {
//   logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", err);
//   process.exit(1);
// });

// // Handle unhandled promise rejections
// process.on("unhandledRejection", (err) => {
//   logger.error("UNHANDLED REJECTION! 💥 Shutting down...", err);
//   process.exit(1);
// });
