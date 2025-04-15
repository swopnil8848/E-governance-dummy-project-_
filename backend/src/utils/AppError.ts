export interface IAppError extends Error {
    statusCode: number;
    status: string;
    isOperational: boolean;
}

export default class AppError extends Error implements IAppError{
    public statusCode: number;
    public status: string;
    public isOperational: boolean;

    constructor(message:string,statusCode:number){
      super(message);
  
      this.statusCode = statusCode;
      this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      Error.captureStackTrace(this,this.constructor)
    }
  }
  
