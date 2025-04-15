import mongoose, { Schema, Document, Query } from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

export enum UserRole {
  Superadmin = "superadmin",
  Admin = "admin",
  Worker = "worker",
  User = "user",
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  id: string; // Add this line - Document interface should provide this virtual property
  name: string;
  email: string;
  googleId: string;
  password?: string;
  isVerified: boolean;
  isActive: boolean;
  role: string;
  DOB: Date;
  passportId: string;
  phone: string;
  createdAt?: Date;
  updatedAt?: Date;
  otp?: string;
  passwordChangedAt?: Date;
  forgotPasswordOTP?: string;
  otpExpiresat?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  generateOTP: () => Promise<string>;
  correctPassword(
    candidatePassword: string,
    userPassword: string
  ): Promise<boolean>;
  changedPasswordAfter(JWTTimestamp: number): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is a required filed"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is a required field"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    DOB: {
      type: Date,
      // required:[true,'Please specify your date of birth']
    },
    passportId: {
      type: String,
      // required:[true,'Please provide you citizenship Id or national Id']
    },
    password: {
      type: String,
      required: false, // oauth login
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    googleId: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
    },
    phone: {
      type: String,
      // required:[true,'Please provide a Phone Number']
    },
    otp: String,
    passwordChangedAt: Date,
    forgotPasswordOTP: String,
    otpExpiresat: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true }
);

// Add virtual property for 'id'
UserSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are included when converting to JSON
UserSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

UserSchema.pre<IUser>("save", async function (next) {
  // Only run this function if the password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with a cost of 14
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 14);
  }

  next();
});

UserSchema.pre<IUser>("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

UserSchema.pre<Query<any, IUser>>(/^find/, function (next) {
  // `this` points to the current query
  this.where({ active: { $ne: false } });
  next();
});

UserSchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPassword: string
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

UserSchema.methods.changedPasswordAfter = function (
  JWTTimestamp: number
): boolean {
  let changedTimeStamp: number | undefined;
  if (this.passwordChangedAt) {
    changedTimeStamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
  }
  return JWTTimestamp < (changedTimeStamp || 0);
};

UserSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

UserSchema.methods.generateOTP = async function (): Promise<string> {
  let length = 6;
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  this.otp = otp;
  this.otpExpiresat = Date.now() + 10 * 60 * 1000;

  await this.save();

  return otp;
};

const User = mongoose.model<IUser>("User", UserSchema);
export default User;
