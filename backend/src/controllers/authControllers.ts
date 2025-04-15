import mongoose from "mongoose";
import User, { IUser, UserRole } from "../models/userModel";
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import AppError from "../utils/AppError";
import { NextFunction, Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import logger from "../utils/logger";
import { Email } from "../utils/email";

const signToken = (id: mongoose.Types.ObjectId) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const expiresIn = Number(process.env.JWT_EXPIRES_IN) || 90000; // Default fallback value

  // Create and explicitly type the options object
  const options: SignOptions = { expiresIn };

  return jwt.sign({ id }, jwtSecret, options);
};

const createSendToken = async (
  user: IUser,
  statusCode: number,
  res: Response
) => {
  const jwtCookieExpiresIn = process.env.JWT_COOKIE_EXPIRES_IN
    ? parseInt(process.env.JWT_COOKIE_EXPIRES_IN)
    : 7;

  const token = await signToken(user._id);

  const baseCookieOptions = {
    expires: new Date(Date.now() + jwtCookieExpiresIn * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "lax" as const, // always allow cross-site
    secure: true, // required when sameSite is 'none'
    path: "/",
  };

  // Attempt to set cookie for .ekrasunya.com
  res.cookie("jwt", token, {
    ...baseCookieOptions,
    domain: ".ekrasunya.com",
  });
  // res.cookie("token", token, {
  //   ...baseCookieOptions,
  //   domain: ".ekrasunya.com",
  // });

  // Also set cookie for localhost (for development tools or local API testing)
  res.cookie("jwt", token, {
    ...baseCookieOptions,
    domain: "localhost",
  });
  // res.cookie("token_local", token, {
  //   ...baseCookieOptions,
  //   domain: "localhost",
  // });

  // Remove the password from user object
  const userObject = user.toJSON ? user.toJSON() : user.toObject();
  const userWithoutPassword = { ...userObject, password: undefined };

  res.status(statusCode).json({
    status: "success",
    token,
    data: userWithoutPassword,
  });
};

const signup = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log("signup being called");
    if (!req.body.email) {
      return next(new AppError("Email is a required field", 400));
    }

    if (!req.body.password) {
      return next(new AppError("Password is a required field", 400));
    }

    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      role: "user",
      password: req.body.password,
    });

    const signedToken = await signToken(newUser.id);

    // Email sending code is commented out but has incorrect casing
    const url = `${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }/verify-email/${signedToken}`;
    const email = new Email(
      { email: req.body.email, firstName: req.body.name },
      url
    );
    email.send({
      templateName: "signup",
      subject: "Registration Successful (verify Email)",
    });
    createSendToken(newUser, 201, res);
  }
);

const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    console.log("this route is being called");

    if (!email || !password) {
      return next(new AppError("Please enter the email and password", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      // Use generic error message for security
      return next(new AppError("Incorrect email or password", 401));
    }

    // Handle case when user signed up with OAuth
    const savedPassword = user.password || "";
    if (!(await user.correctPassword(password, savedPassword))) {
      return next(new AppError("Incorrect email or password", 401));
    }

    // Uncomment if email verification is required
    // if (!user.isVerified) {
    //   return next(new AppError("Please verify your email first", 400));
    // }

    console.log("auth login is being called");

    createSendToken(user, 200, res);
  }
);

const getMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    logger.info("User ID: ", req.user);

    const userId = (req.user as IUser)._id;

    if (!userId) {
      return next(new AppError("User ID is not provided", 400));
    }

    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError("No user found", 404));
    }

    // Using toJSON() is safer than toObject() with spread operator
    const userObject = user.toJSON ? user.toJSON() : user.toObject();
    const userWithoutPassword = { ...userObject, password: undefined };

    return res.status(200).json({
      status: "success",
      data: userWithoutPassword,
    });
  }
);

const verifyOtp = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return next(new AppError("UserId and OTP are required", 400));
    }

    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Check if OTP has expired
    // if (user.otpExpires && user.otpExpires < new Date()) {
    //   return next(new AppError("OTP has expired", 401));
    // }

    // Simple string comparison might be susceptible to timing attacks
    // Consider using a constant-time comparison function
    const verifyOtp = user.otp === otp;

    if (!verifyOtp) {
      return next(new AppError("Incorrect OTP provided", 401));
    }

    user.isVerified = true;
    user.otp = undefined; // Clear OTP after successful verification
    // user.otpExpires = undefined;
    await user.save();

    res.status(200).json({
      status: "success",
      message: "User email verified successfully",
      data: { id: user._id, email: user.email, isVerified: user.isVerified },
    });
  }
);

// Helper function to solve ts error on jwt.verify
async function verifyToken(token: string): Promise<JwtPayload> {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  return new Promise((resolve, reject) => {
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        return reject("Invalid or expired token. Please log in again.");
      } else {
        resolve(decoded as JwtPayload);
      }
    });
  });
}

// Middleware to authenticate the user
const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Get token from headers or cookies
    let token;
    console.log("token:: ", token);
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      console.log("req.headers.authorization:: ", req.headers.authorization);
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    // Don't log tokens in production - security risk
    if (process.env.NODE_ENV !== "production") {
      logger.info("Token received");
    }
    ``;

    if (!token) {
      return next(new AppError("Please log in first", 401));
    }

    // Verify token
    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (err: any) {
      return next(new AppError(err, 401));
    }

    // Check if user still exists
    const freshUser = await User.findById(decoded?.id);

    if (!freshUser) {
      return next(
        new AppError("The user belonging to this token no longer exists", 401)
      );
    }

    // Check if password was changed after token was issued
    const jwtGeneratedAt = decoded.iat || 0;
    const passwordChanged = await freshUser.changedPasswordAfter(
      jwtGeneratedAt
    );

    if (passwordChanged) {
      return next(
        new AppError("Password changed recently. Please log in again", 401)
      );
    }

    // Attach user to request for downstream middleware
    req.user = freshUser;
    next();
  }
);

// Middleware to authorize routes based on user roles
const restrictTo = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    if (!roles.includes((req.user as IUser).role as UserRole)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

const verifyEmail = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.params.token;

    console.log("token:: ", token);

    if (!token) {
      return next(new AppError("Token Not Found!", 400));
    }

    let decoded;
    try {
      decoded = await verifyToken(token);

      console.log("decoded::", decoded);
    } catch (err: any) {
      console.log("errorr:: ", err);
      return next(new AppError(err.message || "Invalid Token", 401));
    }

    if (!decoded.id) {
      return next(new AppError("User Couldn't be Verified!", 401));
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError("User not found!", 404));
    }

    user.isVerified = true;
    await user.save({ validateBeforeSave: false });

    createSendToken(user, 200, res);
  }
);

const getAllUsers = async (req: Request, res: Response): Promise<any> => {
  try {
    const users = await User.find({ isActive: true })
      .select("_id name email role")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export {
  signup,
  login,
  getMe,
  verifyOtp,
  protect,
  restrictTo,
  createSendToken,
  verifyToken,
  verifyEmail,
  getAllUsers,
};
