import mongoose, { Schema } from "mongoose";

const workerGroupSchema = new Schema({
  groupName: { type: String, required: true },
  // Array of references to User documents with role 'worker'
  workerIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
  contactInfo: { type: String },
  // Indicates whether the group is available or currently busy
  availabilityStatus: {
    type: String,
    enum: ["available", "busy"],
    default: "available",
  },
});

module.exports = mongoose.model("WorkerGroup", workerGroupSchema);
