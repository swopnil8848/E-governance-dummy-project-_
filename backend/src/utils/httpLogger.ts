import morgan from "morgan";
import { Request, Response, NextFunction } from "express";
import logger from "./logger";

// Define a custom token for request body
morgan.token("body", (req: Request) => {
  const body = req.body;
  // Don't log passwords or sensitive data
  if (body) {
    const sanitized = { ...body };
    if (sanitized.password) sanitized.password = "[REDACTED]";
    if (sanitized.passwordConfirm) sanitized.passwordConfirm = "[REDACTED]";
    return JSON.stringify(sanitized);
  }
  return "";
});

// Define a custom token for response body
morgan.token("response-body", (req: Request, res: any) => {
  // Skip for large responses
  if (res.responseBody && JSON.stringify(res.responseBody).length < 1000) {
    const sanitized = { ...res.responseBody };
    // Redact sensitive fields if needed
    return JSON.stringify(sanitized);
  }
  return "";
});

// Create middleware to capture response body
const responseBodyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalSend = res.send;
  res.send = function (body: any) {
    (res as any).responseBody = body;
    return originalSend.call(this, body);
  };
  next();
};

// Define different formats for development and production
const developmentFormat =
  ":method :url :status :response-time ms - :body - :response-body";
const productionFormat =
  ":remote-addr - :method :url :status :response-time ms";

// Create a stream object with a proper 'write' method for Morgan
const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Create middleware functions that can be directly used
const developmentLogger = [
  responseBodyMiddleware,
  morgan(developmentFormat, { stream })
];

const productionLogger = morgan(productionFormat, { stream });

// Export HTTP logger middleware that returns middleware based on environment
const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const env = process.env.NODE_ENV || "development";
  
  if (env === "development") {
    // For development, we need to first apply responseBodyMiddleware
    responseBodyMiddleware(req, res, () => {
      // Then apply Morgan middleware
      morgan(developmentFormat, { stream })(req, res, next);
    });
  } else {
    // For production, just apply Morgan with production format
    morgan(productionFormat, { stream })(req, res, next);
  }
};

export default httpLogger;