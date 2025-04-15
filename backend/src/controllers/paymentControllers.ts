import { Request, Response } from "express";
import Payment from "../models/paymentModel";
import {
  initializeKhaltiPayment,
  verifyKhaltiPayment,
  KhaltiPayload,
} from "../utils/khaltiPayment";
import User, { IUser, UserRole } from "../models/userModel";
import Bill from "../models/billModel";
import RegistrationRequest from "../models/registrationRequestModel";
import { Types } from "mongoose";
import Stripe from "stripe";
import dotenv from "dotenv";

const isAdmin = (role: string): boolean => {
  return role === UserRole.Admin || role === UserRole.Superadmin;
};

interface RequestWithUser extends Request {
  user: IUser;
}

export const initializeBillPayment = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const billId = req.params.id;
    const { paymentMethod, website_url } = req.body;

    // Validate payment method
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    // Find the bill
    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    // Check if bill belongs to user
    if (bill.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this bill",
      });
    }

    // Check if bill is already paid
    if (bill.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "This bill has already been paid",
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create payment record
    const payment = await Payment.create({
      userId,
      amount: bill.amount,
      serviceType: bill.serviceType,
      relatedId: bill._id,
      relatedModel: "Bill",
      status: "pending",
      paymentMethod,
    });

    // Prepare Khalti payment data
    const fullName = user.name;
    const amountInPaisa = bill.amount * 100;

    const khaltiPayload: KhaltiPayload = {
      amount: amountInPaisa,
      purchase_order_id: (payment._id as Types.ObjectId).toString(),
      purchase_order_name: `${
        bill.serviceType.charAt(0).toUpperCase() + bill.serviceType.slice(1)
      } Bill Payment`,
      customer_info: {
        name: fullName,
        email: user.email,
        phone: user.phone,
      },
      product_details: [
        {
          identity: (bill._id as Types.ObjectId).toString(),
          name: `${
            bill.serviceType.charAt(0).toUpperCase() + bill.serviceType.slice(1)
          } Service Bill`,
          total_price: amountInPaisa,
          quantity: 1,
          unit_price: amountInPaisa,
        },
      ],
      amount_breakdown: [
        {
          label: "Total Amount",
          amount: amountInPaisa,
        },
      ],
      return_url: `${website_url || process.env.FRONTEND_URL}/payment/verify`,
      website_url: website_url || process.env.FRONTEND_URL,
    };

    // Initialize payment with Khalti
    const paymentInitiate = await initializeKhaltiPayment(khaltiPayload);

    // Update payment record with pidx
    await Payment.findByIdAndUpdate(payment._id, {
      pidx: paymentInitiate.pidx,
    });

    return res.json({
      success: true,
      data: {
        paymentId: payment._id,
        payment: paymentInitiate,
        amount: bill.amount,
        customerName: fullName,
      },
    });
  } catch (error: any) {
    console.error("Error initializing payment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const initializeRegistrationPayment: any = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user._id;
    const registrationId = req.params.registrationId;
    const { paymentMethod, amount, website_url } = req.body;

    // Validate required fields
    if (!paymentMethod || !amount) {
      return res.status(400).json({
        success: false,
        message: "Payment method and amount are required",
      });
    }

    // Validate amount
    if (!Number.isFinite(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount provided",
      });
    }

    console.log("registrationid:: ", registrationId);

    // Find the registration request
    const registration = await RegistrationRequest.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration request not found",
      });
    }

    // Check if registration belongs to user
    if (registration.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this registration request",
      });
    }

    // Check if registration is approved (only approved registrations can be paid)
    if (registration.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved registration requests can proceed to payment",
      });
    }

    // Check if registration is already paid
    if (registration.paymentId) {
      const existingPayment = await Payment.findById(registration.paymentId);
      if (existingPayment && existingPayment.status === "completed") {
        return res.status(400).json({
          success: false,
          message: "This registration request has already been paid",
        });
      }
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create payment record
    const payment = await Payment.create({
      userId,
      amount: parseFloat(amount),
      serviceType: "registration",
      relatedId: registration._id,
      relatedModel: "RegistrationRequest",
      status: "pending",
      paymentMethod,
    });

    // Update registration with payment ID
    await RegistrationRequest.findByIdAndUpdate(registrationId, {
      paymentId: payment._id,
    });

    // Prepare Khalti payment data
    const fullName = user.name;
    const amountInPaisa = parseFloat(amount) * 100;

    const khaltiPayload: KhaltiPayload = {
      amount: amountInPaisa,
      purchase_order_id: (payment._id as Types.ObjectId).toString(),
      purchase_order_name: `${
        registration.serviceType.charAt(0).toUpperCase() +
        registration.serviceType.slice(1)
      } Service Registration`,
      customer_info: {
        name: fullName,
        email: user.email,
        phone: user.phone,
      },
      product_details: [
        {
          identity: (registration._id as Types.ObjectId).toString(),
          name: `${
            registration.serviceType.charAt(0).toUpperCase() +
            registration.serviceType.slice(1)
          } Service Registration`,
          total_price: amountInPaisa,
          quantity: 1,
          unit_price: amountInPaisa,
        },
      ],
      amount_breakdown: [
        {
          label: "Registration Fee",
          amount: amountInPaisa,
        },
      ],
      return_url: `${
        website_url || process.env.FRONTEND_URL
      }/registration/payment/verify`,
      website_url: website_url || process.env.FRONTEND_URL,
    };

    // Initialize payment with Khalti
    const paymentInitiate = await initializeKhaltiPayment(khaltiPayload);

    // Update payment record with pidx
    await Payment.findByIdAndUpdate(payment._id, {
      pidx: paymentInitiate.pidx,
    });

    return res.json({
      success: true,
      data: {
        paymentId: payment._id,
        payment: paymentInitiate,
        amount: parseFloat(amount),
        customerName: fullName,
      },
    });
  } catch (error: any) {
    console.error("Error initializing registration payment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { pidx, purchase_order_id } = req.body;

    if (!pidx || !purchase_order_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    // Find the payment
    const payment = await Payment.findById(purchase_order_id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Verify with Khalti
    const paymentInfo = await verifyKhaltiPayment(pidx);

    // Validate payment
    const isPaymentValid =
      paymentInfo.status === "Completed" && paymentInfo.pidx === pidx;

    if (!isPaymentValid) {
      await Payment.findByIdAndUpdate(purchase_order_id, {
        status: "failed",
        failureReason: "Payment verification failed",
        lastChecked: new Date(),
        paymentResponse: paymentInfo,
      });

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
        details: {
          status: paymentInfo.status !== "Completed" ? "Invalid status" : null,
        },
      });
    }

    // Update payment record
    await Payment.findByIdAndUpdate(purchase_order_id, {
      status: "completed",
      transactionId: paymentInfo.transaction_id,
      paymentCompletedAt: new Date(),
      paymentResponse: paymentInfo,
    });

    // Handle service-specific updates
    if (payment.serviceType === "registration") {
      // For registration payment: update registration status
      await RegistrationRequest.findByIdAndUpdate(payment.relatedId, {
        status: "completed",
      });
    } else {
      // For bill payment: update bill status
      await Bill.findByIdAndUpdate(payment.relatedId, {
        status: "paid",
        paymentId: payment._id,
      });
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error: any) {
    console.error("Erro Creating payment");
    return res.json({
      success: false,
      message: "Payment verified successfully",
    });
  }
};

dotenv.config();

const {
  STRIPE_SECRET_KEY,
  FRONTEND_SUCCESS_URL = "https://dev.4aconsultingservices.com.au/payment/success",
  FRONTEND_CANCEL_URL = "http://dev.4aconsultingservices.com.au/payment/cancel",
} = process.env;

if (!STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY must be defined in environment variables");
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Helper function to initialize a Stripe payment session
const initializeStripePayment = async (
  amount: number,
  description: string,
  metadata: Record<string, string>,
  customerEmail: string,
  successUrl: string,
  cancelUrl: string
) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd", // Change to your preferred currency
          product_data: {
            name: description,
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: customerEmail,
    metadata,
  });

  return session;
};

// Helper function to verify a Stripe payment
const verifyStripePayment = async (sessionId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  return session;
};

export const stripe_initializeBillPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user._id;
    const billId = req.params.billId;
    const { paymentMethod, website_url } = req.body;

    console.log("billId:: ", billId);

    // Validate payment method
    if (paymentMethod !== "stripe") {
      return res.status(400).json({
        success: false,
        message: "Payment method must be 'stripe'",
      });
    }

    // Find the bill
    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    // Check if bill belongs to user
    if (bill.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this bill",
      });
    }

    // Check if bill is already paid
    if (bill.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "This bill has already been paid",
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create payment record
    const payment = await Payment.create({
      userId,
      amount: bill.amount,
      serviceType: bill.serviceType,
      relatedId: bill._id,
      relatedModel: "Bill",
      status: "pending",
      paymentMethod,
    });

    // Prepare Stripe payment data
    const fullName = user.name;
    const paymentDescription = `${
      bill.serviceType.charAt(0).toUpperCase() + bill.serviceType.slice(1)
    } Bill Payment`;

    const baseUrl =
      website_url || process.env.FRONTEND_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/payment/verify?session_id={CHECKOUT_SESSION_ID}&purchase_order_id=${payment._id}`;
    const cancelUrl = `${baseUrl}/payment/cancel?purchase_order_id=${payment._id}`;

    // Initialize payment with Stripe
    const session = await initializeStripePayment(
      bill.amount,
      paymentDescription,
      {
        payment_id: (payment._id as Types.ObjectId).toString(),
        bill_id: (bill._id as Types.ObjectId).toString(),
        service_type: bill.serviceType,
        user_id: userId.toString(),
      },
      user.email,
      successUrl,
      cancelUrl
    );

    // Update payment record with Stripe session ID
    await Payment.findByIdAndUpdate(payment._id, {
      sessionId: session.id,
    });

    return res.json({
      success: true,
      data: {
        paymentId: payment._id,
        payment: {
          sessionId: session.id,
          url: session.url,
        },
        amount: bill.amount,
        customerName: fullName,
      },
    });
  } catch (error: any) {
    console.error("Error initializing payment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const stripe_initializeRegistrationPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user._id;
    const registrationId = req.params.registrationId;
    const { paymentMethod, amount, website_url } = req.body;

    // Validate required fields
    if (!paymentMethod || !amount) {
      return res.status(400).json({
        success: false,
        message: "Payment method and amount are required",
      });
    }

    // Validate payment method
    if (paymentMethod !== "stripe") {
      return res.status(400).json({
        success: false,
        message: "Payment method must be 'stripe'",
      });
    }

    // Validate amount
    if (!Number.isFinite(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount provided",
      });
    }

    console.log("registrationid:: ", registrationId);

    // Find the registration request
    const registration = await RegistrationRequest.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration request not found",
      });
    }

    // Check if registration belongs to user
    if (registration.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this registration request",
      });
    }

    // Check if registration is approved (only approved registrations can be paid)
    if (registration.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved registration requests can proceed to payment",
      });
    }

    // Check if registration is already paid
    if (registration.paymentId) {
      const existingPayment = await Payment.findById(registration.paymentId);
      if (existingPayment && existingPayment.status === "completed") {
        return res.status(400).json({
          success: false,
          message: "This registration request has already been paid",
        });
      }
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create payment record
    const payment = await Payment.create({
      userId,
      amount: parseFloat(amount),
      serviceType: "registration",
      relatedId: registration._id,
      relatedModel: "RegistrationRequest",
      status: "pending",
      paymentMethod,
    });

    // Update registration with payment ID
    await RegistrationRequest.findByIdAndUpdate(registrationId, {
      paymentId: payment._id,
    });

    // Prepare Stripe payment data
    const fullName = user.name;
    const paymentDescription = `${
      registration.serviceType.charAt(0).toUpperCase() +
      registration.serviceType.slice(1)
    } Service Registration`;

    const baseUrl =
      website_url || process.env.FRONTEND_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/stripe/registration/payment/verify?session_id={CHECKOUT_SESSION_ID}&purchase_order_id=${payment._id}`;
    const cancelUrl = `${baseUrl}/registration/payment/cancel?purchase_order_id=${payment._id}`;

    // Initialize payment with Stripe
    const session = await initializeStripePayment(
      parseFloat(amount),
      paymentDescription,
      {
        payment_id: (payment._id as Types.ObjectId).toString(),
        registration_id: (registration._id as Types.ObjectId).toString(),
        service_type: registration.serviceType,
        user_id: userId.toString(),
      },
      user.email,
      successUrl,
      cancelUrl
    );

    // Update payment record with Stripe session ID
    await Payment.findByIdAndUpdate(payment._id, {
      sessionId: session.id,
    });

    return res.json({
      success: true,
      data: {
        paymentId: payment._id,
        payment: {
          sessionId: session.id,
          url: session.url,
        },
        amount: parseFloat(amount),
        customerName: fullName,
      },
    });
  } catch (error: any) {
    console.error("Error initializing registration payment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const stripe_verifyPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { session_id, purchase_order_id } = req.query;

    if (!session_id || !purchase_order_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    // Find the payment
    const payment = await Payment.findById(purchase_order_id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Verify with Stripe
    const session = await verifyStripePayment(session_id as string);

    // Validate payment
    const isPaymentValid =
      session.payment_status === "paid" && session.status === "complete";

    if (!isPaymentValid) {
      await Payment.findByIdAndUpdate(purchase_order_id, {
        status: "failed",
        failureReason: "Payment verification failed",
        lastChecked: new Date(),
        paymentResponse: session,
      });

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
        details: {
          status:
            session.payment_status !== "paid"
              ? "Payment not completed"
              : "Session incomplete",
        },
      });
    }

    // Update payment record
    await Payment.findByIdAndUpdate(purchase_order_id, {
      status: "completed",
      transactionId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
      paymentCompletedAt: new Date(),
      paymentResponse: session,
    });

    // Handle service-specific updates
    if (payment.serviceType === "registration") {
      // For registration payment: update registration status
      await RegistrationRequest.findByIdAndUpdate(payment.relatedId, {
        status: "completed",
      });
    } else {
      // For bill payment: update bill status
      await Bill.findByIdAndUpdate(payment.relatedId, {
        status: "paid",
        paymentId: payment._id,
      });
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message,
    });
  }
};

// Handle webhook events from Stripe (optional but recommended)
// export const handleStripeWebhook = async (req: Request, res: Response) => {
//   const sig = req.headers['stripe-signature'] as string;

//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET || ''
//     );
//   } catch (err: any) {
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Handle the event
//   switch (event.type) {
//     case 'checkout.session.completed':
//       const session = event.data.object;

//       // Find payment by session ID
//       const payment = await Payment.findOne({ sessionId: session.id });

//       if (payment) {
//         // Update payment status
//         await Payment.findByIdAndUpdate(payment._id, {
//           status: "completed",
//           transactionId: session.payment_intent as string,
//           paymentCompletedAt: new Date(),
//           paymentResponse: session,
//         });

//         // Update related document status
//         if (payment.serviceType === "registration") {
//           await RegistrationRequest.findByIdAndUpdate(payment.relatedId, {
//             status: "completed",
//           });
//         } else {
//           await Bill.findByIdAndUpdate(payment.relatedId, {
//             status: "paid",
//             paymentId: payment._id,
//           });
//         }
//       }
//       break;
//     default:
//       console.log(`Unhandled event type ${event.type}`);
//   }

//   // Return a 200 response to acknowledge receipt of the event
//   res.send();
// };
