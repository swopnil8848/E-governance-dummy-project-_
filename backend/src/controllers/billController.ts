import { Request, Response } from "express";
import Bill from "../models/billModel";

export const createBill = async (req: Request, res: Response): Promise<any> => {
  try {
    // Check if user is admin
    // if (!isAdmin(req.user.role)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Unauthorized. Admin access required'
    //   });
    // }

    const {
      userId,
      serviceType,
      amount,
      dueDate,
      readingDate,
      meterReading,
      previousReading,
    } = req.body;

    // Validation
    if (
      !userId ||
      !serviceType ||
      !amount ||
      !dueDate ||
      !readingDate ||
      !meterReading ||
      !previousReading
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const consumption = meterReading - previousReading;
    if (consumption < 0) {
      return res.status(400).json({
        success: false,
        message: "Current reading cannot be less than previous reading",
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
      status: "unpaid",
    });

    return res.status(201).json({
      success: true,
      data: bill,
    });
  } catch (error: any) {
    console.error("Error creating bill:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getUserBills = async (req: Request, res: Response):Promise<any> => {
  try {
    const userId = req.user._id;
    const { status, serviceType } = req.query;

    const filter: any = { userId };
    if (status) filter.status = status;
    if (serviceType) filter.serviceType = serviceType;

    const bills = await Bill.find(filter)
      .populate("paymentId")
      .sort({ dueDate: -1 });

    return res.status(200).json({
      success: true,
      data: bills,
    });
  } catch (error: any) {
    console.error("Error fetching bills:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAllBills = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    // if (!isAdmin(req.user.role)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Unauthorized. Admin access required'
    //   });
    // }

    const { status, serviceType, userId } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (serviceType) filter.serviceType = serviceType;
    if (userId) filter.userId = userId;

    const bills = await Bill.find(filter)
      .populate("userId", "name email phone")
      .populate("paymentId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: bills,
    });
  } catch (error: any) {
    console.error("Error fetching bills:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const updateBill = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    // if (!isAdmin(req.user.role)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Unauthorized. Admin access required'
    //   });
    // }

    const { id } = req.params;
    const updateData = { ...req.body };

    // Prevent updating critical fields
    delete updateData.userId;
    delete updateData.status;
    delete updateData.paymentId;

    if (updateData.meterReading && updateData.previousReading) {
      updateData.consumption =
        updateData.meterReading - updateData.previousReading;

      if (updateData.consumption < 0) {
        return res.status(400).json({
          success: false,
          message: "Current reading cannot be less than previous reading",
        });
      }
    }

    const bill = await Bill.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: bill,
    });
  } catch (error: any) {
    console.error("Error updating bill:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const deleteBill = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    // if (!isAdmin(req.user.role)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Unauthorized. Admin access required'
    //   });
    // }

    const { id } = req.params;

    const bill = await Bill.findById(id);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    // Don't allow deletion of paid bills
    if (bill.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Paid bills cannot be deleted",
      });
    }

    await Bill.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Bill deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting bill:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
