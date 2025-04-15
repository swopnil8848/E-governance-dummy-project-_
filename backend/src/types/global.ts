import { Request } from "express";
import { IUser } from "../models/userModel";
import { Multer } from "multer";

declare global {
  namespace Express {
    interface Request {
      user: IUser;
      file?: Multer.File;
    }
  }
}

export {};
