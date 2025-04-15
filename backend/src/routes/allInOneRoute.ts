import mongoose, { Schema, Document, Model } from 'mongoose';
import express, { Request, Response, Router } from 'express';
import axios from 'axios';
import { protect } from '../controllers/authControllers';
// import { auth } from '../middleware/auth';

// =================== INTERFACES ===================

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRegistrationRequest extends Document {
  userId: mongoose.Types.ObjectId;
  serviceType: 'water' | 'electricity';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  submittedAt: Date;
  verifiedAt?: Date;
  scheduledDate?: Date;
  adminComments?: string;
  address: string;
  paymentId?: mongoose.Types.ObjectId;
}

export interface IBill extends Document {
  userId: mongoose.Types.ObjectId;
  serviceType: 'water' | 'electricity';
  amount: number;
  dueDate: Date;
  readingDate: Date;
  meterReading: number;
  previousReading: number;
  consumption: number;
  status: 'unpaid' | 'paid' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
  paymentId?: mongoose.Types.ObjectId;
}

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  serviceType: 'water' | 'electricity' | 'registration';
  relatedId: mongoose.Types.ObjectId; // Bill ID or Registration ID
  status: 'pending' | 'completed' | 'failed' | 'error';
  pidx?: string;
  transactionId?: string;
  paymentMethod: string;
  paymentCompletedAt?: Date;
  paymentResponse?: any;
  failureReason?: string;
  lastChecked?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =================== SCHEMAS ===================

const UserSchema = new Schema<IUser>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const RegistrationRequestSchema = new Schema<IRegistrationRequest>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, enum: ['water', 'electricity'], required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  submittedAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date },
  scheduledDate: { type: Date },
  adminComments: { type: String },
  address: { type: String, required: true },
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' }
});

const BillSchema = new Schema<IBill>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, enum: ['water', 'electricity'], required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  readingDate: { type: Date, required: true },
  meterReading: { type: Number, required: true },
  previousReading: { type: Number, required: true },
  consumption: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['unpaid', 'paid', 'overdue'], 
    default: 'unpaid' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' }
});

const PaymentSchema = new Schema<IPayment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  serviceType: { 
    type: String, 
    enum: ['water', 'electricity', 'registration'], 
    required: true 
  },
  relatedId: { 
    type: Schema.Types.ObjectId, 
    required: true,
    refPath: 'serviceType' === 'registration' ? 'RegistrationRequest' : 'Bill'
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'error'], 
    default: 'pending' 
  },
  pidx: { type: String },
  transactionId: { type: String },
  paymentMethod: { type: String, required: true },
  paymentCompletedAt: { type: Date },
  paymentResponse: { type: Object },
  failureReason: { type: String },
  lastChecked: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// =================== MODELS ===================

const User = mongoose.model<IUser>('User', UserSchema);
const RegistrationRequest = mongoose.model<IRegistrationRequest>('RegistrationRequest', RegistrationRequestSchema);
const Bill = mongoose.model<IBill>('Bill', BillSchema);
const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

// =================== KHALTI PAYMENT FUNCTIONS ===================

interface KhaltiPayloadCustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface KhaltiPayloadProductDetail {
  identity: string;
  name: string;
  total_price: number;
  quantity: number;
  unit_price: number;
}

interface KhaltiPayloadAmountBreakdown {
  label: string;
  amount: number;
}

interface KhaltiPayload {
  amount: number;
  purchase_order_id: string;
  purchase_order_name: string;
  customer_info: KhaltiPayloadCustomerInfo;
  product_details: KhaltiPayloadProductDetail[];
  amount_breakdown: KhaltiPayloadAmountBreakdown[];
  return_url: string;
  website_url: string;
}

async function initializeKhaltiPayment(details: KhaltiPayload): Promise<any> {
  const headersList = {
    Authorization: `Key ${process.env.KHALTI_LIVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  };

  const reqOptions = {
    url: "https://khalti.com/api/v2/epayment/initiate/",
    method: "post",
    headers: headersList,
    data: details,
  };

  try {
    const response = await axios.request(reqOptions);
    return response.data;
  } catch (error) {
    console.error("Error initializing Khalti payment:", error);
    throw error;
  }
}

async function verifyKhaltiPayment(pidx: string): Promise<any> {
  const headersList = {
    Authorization: `Key ${process.env.KHALTI_LIVE_SECRET_KEY}`,
    "Content-Type": "application/json",
  };

  const bodyContent = JSON.stringify({ pidx });

  const reqOptions = {
    url: `https://khalti.com/api/v2/epayment/lookup/`,
    method: "POST",
    headers: headersList,
    data: bodyContent,
  };

  try {
    const response = await axios.request(reqOptions);
    return response.data;
  } catch (error) {
    console.error("Error verifying Khalti payment:", error);
    throw error;
  }
}

// =================== ROUTES ===================

// Create router for all utility management routes
const router: Router = express.Router();

// ====== REGISTRATION REQUEST ROUTES ======

// Submit new registration request
router.post('/registration-request', protect, async (req: Request, res: Response) => {
  try {
    const { serviceType, address } = req.body;
    const userId = req.user.id;

    // Validation
    if (!serviceType || !address) {
      return res.status(400).json({
        success: false,
        message: 'Service type and address are required'
      });
    }

    // Check if user already has pending request for this service
    const existingRequest = await RegistrationRequest.findOne({
      userId,
      serviceType,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existingRequest.status} request for ${serviceType} service`
      });
    }

    // Create new registration request
    const registrationRequest = await RegistrationRequest.create({
      userId,
      serviceType,
      address,
      status: 'pending',
      submittedAt: new Date()
    });

    return res.status(201).json({
      success: true,
      data: registrationRequest
    });
  } catch (error) {
    console.error('Error creating registration request:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all registration requests for user
router.get('/registration-requests', protect, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    const registrationRequests = await RegistrationRequest.find({ userId })
      .populate('paymentId')
      .sort({ submittedAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: registrationRequests
    });
  } catch (error) {
    console.error('Error fetching registration requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Admin: Get all pending registration requests
router.get('/admin/registration-requests', protect, async (req: Request, res: Response) => {
  try {
    // Assuming there's an isAdmin middleware or check
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required'
      });
    }
    
    const { status } = req.query;
    const filter = status ? { status } : {};
    
    const registrationRequests = await RegistrationRequest.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .populate('paymentId')
      .sort({ submittedAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: registrationRequests
    });
  } catch (error) {
    console.error('Error fetching registration requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Admin: Update registration request status
router.patch('/admin/registration-request/:id', protect, async (req: Request, res: Response) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required'
      });
    }
    
    const { id } = req.params;
    const { status, scheduledDate, adminComments } = req.body;
    
    const allowedStatuses = ['approved', 'rejected', 'completed'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const updateData: any = {};
    if (status) updateData.status = status;
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (adminComments) updateData.adminComments = adminComments;
    if (status === 'approved' || status === 'rejected') updateData.verifiedAt = new Date();
    
    const updatedRequest = await RegistrationRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'firstName lastName email');
    
    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: 'Registration request not found'
      });
    }

    // Here you could add notification logic (email, SMS, etc.)
    
    return res.status(200).json({
      success: true,
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error updating registration request:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ====== BILL MANAGEMENT ROUTES ======

// Admin: Create new bill
router.post('/admin/bills', protect, async (req: Request, res: Response) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required'
      });
    }
    
    const { 
      userId, 
      serviceType, 
      amount, 
      dueDate, 
      readingDate, 
      meterReading, 
      previousReading 
    } = req.body;
    
    // Validation
    if (!userId || !serviceType || !amount || !dueDate || !readingDate || 
        !meterReading || !previousReading) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    const consumption = meterReading - previousReading;
    if (consumption < 0) {
      return res.status(400).json({
        success: false,
        message: 'Current reading cannot be less than previous reading'
      });
    }
    
    const bill = await Bill.create({
      userId,
      serviceType,
      amount,
      dueDate: new Date(dueDate),
      readingDate: new Date(readingDate),
      meterReading,
      previousReading,
      consumption,
      status: 'unpaid'
    });
    
    return res.status(201).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Error creating bill:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get bills for user
router.get('/bills', protect, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { status, serviceType } = req.query;
    
    const filter: any = { userId };
    if (status) filter.status = status;
    if (serviceType) filter.serviceType = serviceType;
    
    const bills = await Bill.find(filter)
      .populate('paymentId')
      .sort({ dueDate: -1 });
    
    return res.status(200).json({
      success: true,
      data: bills
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Admin: Get all bills
router.get('/admin/bills', protect, async (req: Request, res: Response) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. Admin access required'
      });
    }
    
    const { status, serviceType, userId } = req.query;
    
    const filter: any = {};
    if (status) filter.status = status;
    if (serviceType) filter.serviceType = serviceType;
    if (userId) filter.userId = userId;
    
    const bills = await Bill.find(filter)
      .populate('userId', 'firstName lastName email')
      .populate('paymentId')
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      data: bills
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ====== PAYMENT ROUTES ======

// Initialize payment for bill
router.post('/initialize-payment/bill/:id', protect, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const billId = req.params.id;
    const { paymentMethod, website_url } = req.body;
    
    // Validate payment method
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }
    
    // Find the bill
    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found'
      });
    }
    
    // Check if bill belongs to user
    if (bill.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this bill'
      });
    }
    
    // Check if bill is already paid
    if (bill.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'This bill has already been paid'
      });
    }
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Create payment record
    const payment = await Payment.create({
      userId,
      amount: bill.amount,
      serviceType: bill.serviceType,
      relatedId: bill._id,
      status: 'pending',
      paymentMethod
    });
    
    // Prepare Khalti payment data
    const fullName = `${user.firstName} ${user.lastName}`;
    const amountInPaisa = bill.amount * 100;
    
    const khaltiPayload: KhaltiPayload = {
      amount: amountInPaisa,
      purchase_order_id: payment._id.toString(),
      purchase_order_name: `${bill.serviceType.charAt(0).toUpperCase() + bill.serviceType.slice(1)} Bill Payment`,
      customer_info: {
        name: fullName,
        email: user.email,
        phone: user.phone
      },
      product_details: [
        {
          identity: bill._id.toString(),
          name: `${bill.serviceType.charAt(0).toUpperCase() + bill.serviceType.slice(1)} Service Bill`,
          total_price: amountInPaisa,
          quantity: 1,
          unit_price: amountInPaisa
        }
      ],
      amount_breakdown: [
        {
          label: "Total Amount",
          amount: amountInPaisa
        }
      ],
      return_url: `${website_url || process.env.FRONTEND_URL}/payment/verify`,
      website_url: website_url || process.env.FRONTEND_URL
    };
    
    // Initialize payment with Khalti
    const paymentInitiate = await initializeKhaltiPayment(khaltiPayload);
    
    // Update payment record with pidx
    await Payment.findByIdAndUpdate(payment._id, {
      pidx: paymentInitiate.pidx
    });
    
    return res.json({
      success: true,
      data: {
        paymentId: payment._id,
        payment: paymentInitiate,
        amount: bill.amount,
        customerName: fullName
      }
    });
  } catch (error) {
    console.error('Error initializing payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Initialize payment for registration
router.post('/initialize-payment/registration/:id', protect, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const registrationId = req.params.id;
    const { paymentMethod, amount, website_url } = req.body;
    
    // Validate required fields
    if (!paymentMethod || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment method and amount are required'
      });
    }
    
    // Validate amount
    if (!Number.isFinite(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount provided'
      });
    }
    
    // Find the registration request
    const registration = await RegistrationRequest.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration request not found'
      });
    }
    
    // Check if registration belongs to user
    if (registration.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this registration request'
      });
    }
    
    // Check if registration is approved (only approved registrations can be paid)
    if (registration.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved registration requests can proceed to payment'
      });
    }
    
    // Check if registration is already paid
    if (registration.paymentId) {
      const existingPayment = await Payment.findById(registration.paymentId);
      if (existingPayment && existingPayment.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'This registration request has already been paid'
        });
      }
    }
    
    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Create payment record
    const payment = await Payment.create({
      userId,
      amount: parseFloat(amount),
      serviceType: 'registration',
      relatedId: registration._id,
      status: 'pending',
      paymentMethod
    });
    
    // Update registration with payment ID
    await RegistrationRequest.findByIdAndUpdate(registrationId, {
      paymentId: payment._id
    });
    
    // Prepare Khalti payment data
    const fullName = `${user.firstName} ${user.lastName}`;
    const amountInPaisa = parseFloat(amount) * 100;
    
    const khaltiPayload: KhaltiPayload = {
      amount: amountInPaisa,
      purchase_order_id: payment._id.toString(),
      purchase_order_name: `${registration.serviceType.charAt(0).toUpperCase() + registration.serviceType.slice(1)} Service Registration`,
      customer_info: {
        name: fullName,
        email: user.email,
        phone: user.phone
      },
      product_details: [
        {
          identity: registration._id.toString(),
          name: `${registration.serviceType.charAt(0).toUpperCase() + registration.serviceType.slice(1)} Service Registration`,
          total_price: amountInPaisa,
          quantity: 1,
          unit_price: amountInPaisa
        }
      ],
      amount_breakdown: [
        {
          label: "Registration Fee",
          amount: amountInPaisa
        }
      ],
      return_url: `${website_url || process.env.FRONTEND_URL}/registration/payment/verify`,
      website_url: website_url || process.env.FRONTEND_URL
    };
    
    // Initialize payment with Khalti
    const paymentInitiate = await initializeKhaltiPayment(khaltiPayload);
    
    // Update payment record with pidx
    await Payment.findByIdAndUpdate(payment._id, {
      pidx: paymentInitiate.pidx
    });
    
    return res.json({
      success: true,
      data: {
        paymentId: payment._id,
        payment: paymentInitiate,
        amount: parseFloat(amount),
        customerName: fullName
      }
    });
  } catch (error) {
    console.error('Error initializing registration payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Verify payment
router.post('/verify-payment', async (req: Request, res: Response) => {
  try {
    const { pidx, purchase_order_id } = req.body;
    
    if (!pidx || !purchase_order_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Find the payment
    const payment = await Payment.findById(purchase_order_id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }
    
    // Verify with Khalti
    const paymentInfo = await verifyKhaltiPayment(pidx);
    
    // Validate payment
    const isPaymentValid = 
      paymentInfo.status === 'Completed' && 
      paymentInfo.pidx === pidx;
    
    if (!isPaymentValid) {
      await Payment.findByIdAndUpdate(purchase_order_id, {
        status: 'failed',
        failureReason: 'Payment verification failed',
        lastChecked: new Date(),
        paymentResponse: paymentInfo
      });
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        details: {
          status: paymentInfo.status !== 'Completed' ? 'Invalid status' : null
        }
      });
    }
    
    // Update payment record
    await Payment.findByIdAndUpdate(purchase_order_id, {
      status: 'completed',
      transactionId: paymentInfo.transaction_id,
      paymentCompletedAt: new Date(),
      paymentResponse: paymentInfo
    });
    
    // Handle service-specific updates
    if (payment.serviceType === 'registration') {
      // For registration payment: update registration status
      await RegistrationRequest.findByIdAndUpdate(payment.relatedId, {
        status: 'completed'
      });
    } else {
      // For bill payment: update bill status
      await Bill.findByIdAndUpdate(payment.relatedId, {
        status: 'paid',
        paymentId: payment._id
      });
    }
    
    return res.json({
      success: true,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    
    // Update payment status to error if possible
    if (req.body.purchase_order_id) {
      try {
        await Payment.findByIdAndUpdate(req.body.purchase_order_id, {
          status: 'error',
          failureReason: error.message || 'Unknown error occurred',
          lastChecked: new Date()
        });
      } catch (dbError) {
        console.error('Error updating payment status:', dbError);
      }
    }
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error during payment verification',
      error: error.message
    });
  }
});

export default router;