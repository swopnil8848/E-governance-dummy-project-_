import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Set up connection events before attempting to connect
    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to db...");
    });

    mongoose.connection.on("error", (err: any) => {
      console.log(`Mongoose connection error: ${err.message}`);
      console.log(`Mongoose connection error:::::::::::::::::::::: ${err}`);
      // Don't exit here - let's retry instead
    });

    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose connection is disconnected...");
      // Attempt to reconnect if not shutting down
    });

    // If the Node process ends, close the Mongoose connection
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log(
        "Mongoose connection is disconnected due to application termination..."
      );
      process.exit(0);
    });

    console.log(process.env.MONGODB_URI);

    if (!process.env.MONGODB_URI) {
      console.error(
        "Error: MONGODB_URI is missing in the environment variables."
      );
      console.error(
        "Please set the MONGODB_URI environment variable and restart the server."
      );
      process.exit(1);
    }

    console.log(
      `Attempting to connect to MongoDB at ${process.env.MONGODB_URI}`
    );

    // Set connection options with reasonable timeouts
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // Default is 30000 (30 seconds)
      socketTimeoutMS: 45000, // Default is never
      connectTimeoutMS: 10000, // Default is 30000
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error: any) {
    console.error(`MongoDB connection error: ${error.message}`);

    // Provide more detailed error messages based on common issues
    if (error.name === "MongoServerSelectionError") {
      console.error("Could not reach MongoDB server. Please check:");
      console.error("1. Is MongoDB running?");
      console.error("2. Is the connection string correct?");
      console.error("3. Is there a firewall blocking the connection?");

      if (error.message.includes("ECONNREFUSED")) {
        console.error(
          "Connection refused - MongoDB is not running or not accessible at the specified address"
        );
      }
    }

    // Instead of exiting, let's implement a retry mechanism
    console.log("Attempting to reconnect in 5 seconds...");
    setTimeout(() => connectDB(), 5000);

    return false;
  }
};

export default connectDB;
