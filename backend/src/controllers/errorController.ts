import AppError from '../utils/AppError'
import fs from 'fs'
import { NextFunction, Request, Response } from "express-serve-static-core";
import { CustomError } from "../types/errorTypes";

const handleCastErrorDB = (err:any) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleFileSizeError = ()=>{
    const message='file limit: 2mb'
    return new AppError(message,400);
}

const handleDuplicateFieldsDB = (err:any) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  // console.log(value);

  const message = `Duplicate field value for: ${Object.keys(err.keyValue).join(", ")}`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err:any) => {
  const errors = Object.values(err.errors).map((el:any) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err:any,req:Request, res:Response) => {
  //A) API 
  console.log("this is err:: ",err);
  if(req.originalUrl.startsWith('/api')){
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    })}

    // console.log("Error ",err);
    
    //B) RENDERED WEBSITE
    return res.status(err.statusCode).json({
      title: 'Something went wrong!',
      msg:err.message
    });  
};

const sendErrorProd = (err:any,req:Request, res:Response) => {
  // Operational, trusted error: send message to client
  //A) API
  if(req.originalUrl.startsWith('/api')){
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }

    // Log error
    // console.error('ERROR 💥', err);

    // B) Render Website
    return res.status(err.statusCode).json({
      title: 'Something went wrong!',
      msg:err.message
    });

    
    // Programming or other unknown error: don't leak error details
  } 
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      title: 'Something went wrong!',
      msg:err.message
    });
    // Programming or other unknown error: don't leak error details
  }
  else {
    // 1) Log error
    // console.error('ERROR 💥', err);

    // 2) Send generic message
    return res.status(err.statusCode).json({
      title: 'Something went wrong!',
      msg:'please try again later.'
    });
  } 
};

export const globalErrorHandler = (err:CustomError, req:Request, res:Response, next:NextFunction) => {
  console.log("error triggered n backend")
  console.log(err);

  if(req.file){
    fs.unlink(req.file.path, (err) => {
      if (err) {
          console.error("Error deleting invalid file:", err);
      } else {
          console.log(req.file?.path , ' deleted');
      }
    });
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    console.log("development error running")
    sendErrorDev(err,req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.assign(err);

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if(error.code === 'LIMIT_FILE_SIZE') error = handleFileSizeError();

    sendErrorProd(error,req, res);
  }
};
