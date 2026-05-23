const mongoose = require("mongoose");

const driveFileSchema = new mongoose.Schema(
  {
    graphItemId: { type: String, required: true },
    userId: { type: String, required: true },
    userEmail: String,
    name: String,
    path: String,
    size: Number,
    mimeType: String,
    lastModified: Date,
    s3Key: { type: String, default: null },
    uploadStatus: {
      type: String,
      enum: ["pending", "uploading", "uploaded", "failed"],
      default: "pending",
    },
    uploadError: { type: String, default: null },
    exportJobId: String,
    fetchJobId: String,
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  },
  { timestamps: true }
);

driveFileSchema.index({ userId: 1, adminId: 1 });
driveFileSchema.index({ graphItemId: 1, userId: 1, adminId: 1 }, { unique: true });

module.exports = mongoose.model("DriveFile", driveFileSchema);
