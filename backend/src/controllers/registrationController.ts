import { Request, Response } from "express";
import RegistrationRequest from "../models/registrationRequestModel";
import User, { IUser } from "../models/userModel";
import { UserRole } from "../models/userModel";

// Helper function to check if user is admin
const isAdmin = (role: string): boolean => {
  return role === UserRole.Admin || role === UserRole.Superadmin;
};

interface RequestWithUser extends Request {
  user: IUser;
}

export const createRegistrationRequest = async (
  req: RequestWithUser,
  res: Response
): Promise<any> => {
  try {
    const { serviceType, address } = req.body;
    const userId = req.user._id;

    // Validation
    if (!serviceType || !address) {
      return res.status(400).json({
        success: false,
        message: "Service type and address are required",
      });
    }

    // Check if user already has pending request for this service
    const existingRequest = await RegistrationRequest.findOne({
      userId,
      serviceType,
      status: { $in: ["pending", "approved"] },
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existingRequest.status} request for ${serviceType} service`,
      });
    }

    // Create new registration request
    const registrationRequest = await RegistrationRequest.create({
      userId,
      serviceType,
      address,
      status: "pending",
      submittedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      data: registrationRequest,
    });
  } catch (error: any) {
    console.error("Error creating registration request:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getMyRegistrations = async (
  req: RequestWithUser,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query: any = { userId };
    if (status && typeof status === "string") {
      query.status = status;
    }

    const registrations = await RegistrationRequest.find(query).sort({
      submittedAt: -1,
    });

    return res.status(200).json({
      success: true,
      data: registrations,
    });
  } catch (error: any) {
    console.error("Error fetching registration requests:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getUserRegistrationRequests = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user._id;

    const registrationRequests = await RegistrationRequest.find({ userId })
      .populate("paymentId")
      .sort({ submittedAt: -1 });

    return res.status(200).json({
      success: true,
      data: registrationRequests,
    });
  } catch (error: any) {
    console.error("Error fetching registration requests:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// export const getAllRegistrationRequests = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const registrationRequests = await RegistrationRequest.find()
//       .populate("paymentId")
//       .sort({ submittedAt: -1 });

//     return res.status(200).json({
//       success: true,
//       data: registrationRequests,
//     });
//   } catch (error: any) {
//     console.error("Error fetching registration requests:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

export const getAllRegistrationRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // Check if user is admin
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required",
      });
    }

    const { status, page = "1", limit = "10" } = req.query;

    const filter: any = {};
    if (status) filter.status = status;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Count total for pagination metadata
    const total = await RegistrationRequest.countDocuments(filter);

    const registrationRequests = await RegistrationRequest.find(filter)
      .populate("userId", "name email phone")
      .populate("paymentId")
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      data: registrationRequests,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error: any) {
    console.error("Error fetching registration requests:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const updateRegistrationRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // Check if user is admin
    if (!isAdmin(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Admin access required",
      });
    }

    const { id } = req.params;
    const { status, scheduledDate, adminComments } = req.body;

    const allowedStatuses = ["approved", "rejected", "completed"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (adminComments) updateData.adminComments = adminComments;
    if (status === "approved" || status === "rejected")
      updateData.verifiedAt = new Date();

    const updatedRequest = await RegistrationRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("userId", "name email");

    if (!updatedRequest) {
      return res.status(404).json({
        success: false,
        message: "Registration request not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: updatedRequest,
    });
  } catch (error: any) {
    console.error("Error updating registration request:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getRegistrationById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    // Optional: validate the format of the id
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration ID format",
      });
    }

    const registration = await RegistrationRequest.findById(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: registration,
    });
  } catch (error: any) {
    console.error("Error fetching registration by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
