import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./userModel";

export interface IRegistrationRequest extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  serviceType: 'water' | 'electricity';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  submittedAt: Date;
  verifiedAt?: Date;
  scheduledDate?: Date;
  adminComments?: string;
  address: string;
  paymentId?: mongoose.Types.ObjectId;
}

const RegistrationRequestSchema = new Schema<IRegistrationRequest>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    serviceType: { 
      type: String, 
      enum: ['water', 'electricity'], 
      required: true 
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending'
    },
    submittedAt: { 
      type: Date, 
      default: Date.now 
    },
    verifiedAt: { 
      type: Date 
    },
    scheduledDate: { 
      type: Date 
    },
    adminComments: { 
      type: String 
    },
    address: { 
      type: String, 
      required: true 
    },
    paymentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Payment' 
    }
  },
  { timestamps: true }
);

const RegistrationRequest = mongoose.model<IRegistrationRequest>(
  'RegistrationRequest', 
  RegistrationRequestSchema
);

export default RegistrationRequest;