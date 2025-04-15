import { ValidationError } from "class-validator";

export type ErrorTypes = 
  | ValidationError[] 
  | Record<string, string[]>
  | Error
  | unknown;

export interface CustomError extends Error {
    statusCode?: number; // Optional because it may be added later
    status?: string;     // Optional because it may be added later
    code?: number;       // For database-specific errors (e.g., MongoDB's duplicate key error)
    error:ErrorTypes
}
    