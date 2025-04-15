const propertySchema = new Schema({
  address: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  // Records history of ownership transfers
  ownershipHistory: [
    {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      from: { type: Date },
      to: { type: Date },
    },
  ],
});

module.exports = mongoose.model("Property", propertySchema);
