import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./userModel";

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  amount: number;
  serviceType: 'water' | 'electricity' | 'registration';
  relatedId: mongoose.Types.ObjectId;
  relatedModel: string;
  status: 'pending' | 'completed' | 'failed' | 'error';
  pidx?: string;
  transactionId?: string;
  paymentMethod: string;
  paymentCompletedAt?: Date;
  paymentResponse?: any;
  failureReason?: string;
  lastChecked?: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    amount: { 
      type: Number, 
      required: true 
    },
    serviceType: { 
      type: String, 
      enum: ['water', 'electricity', 'registration'], 
      required: true 
    },
    relatedId: { 
      type: Schema.Types.ObjectId, 
      required: true 
    },
    relatedModel: {
      type: String,
      enum: ['Bill', 'RegistrationRequest'],
      required: true
    },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'failed', 'error'], 
      default: 'pending' 
    },
    pidx: { 
      type: String 
    },
    transactionId: { 
      type: String 
    },
    paymentMethod: { 
      type: String, 
      required: true 
    },
    paymentCompletedAt: { 
      type: Date 
    },
    paymentResponse: { 
      type: Object 
    },
    failureReason: { 
      type: String 
    },
    lastChecked: { 
      type: Date 
    }
  },
  { timestamps: true }
);

const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;