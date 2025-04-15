import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./userModel";

export interface IBill extends Document {
  userId: mongoose.Types.ObjectId | IUser;
  serviceType: 'water' | 'electricity';
  amount: number;
  dueDate: Date;
  readingDate: Date;
  meterReading: number;
  previousReading: number;
  consumption: number;
  status: 'unpaid' | 'paid' | 'overdue';
  paymentId?: mongoose.Types.ObjectId;
}

const BillSchema = new Schema<IBill>(
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
    amount: { 
      type: Number, 
      required: true 
    },
    dueDate: { 
      type: Date, 
      required: true 
    },
    readingDate: { 
      type: Date, 
      required: true 
    },
    meterReading: { 
      type: Number, 
      required: true 
    },
    previousReading: { 
      type: Number, 
      required: true 
    },
    consumption: { 
      type: Number, 
      required: true 
    },
    status: { 
      type: String, 
      enum: ['unpaid', 'paid', 'overdue'], 
      default: 'unpaid' 
    },
    paymentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Payment' 
    }
  },
  { timestamps: true }
);

const Bill = mongoose.model<IBill>('Bill', BillSchema);

export default Bill;