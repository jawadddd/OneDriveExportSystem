const mongoose = require("mongoose");

const exportJobSchema = new mongoose.Schema(
  {
    _id: { type: String },
    type: { type: String, enum: ["fetch", "upload"], required: true },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },
    triggeredBy: String,
    adminDisplayName: String,
    totalUsers: { type: Number, default: 0 },
    processedUsers: { type: Number, default: 0 },
    totalFiles: { type: Number, default: 0 },
    processedFiles: { type: Number, default: 0 },
    failedFiles: { type: Number, default: 0 },
    currentUser: { type: String, default: null },
    currentFile: { type: String, default: null },
    error: { type: String, default: null },
    startedAt: Date,
    completedAt: Date,
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true, _id: false }
);

module.exports = mongoose.model("ExportJob", exportJobSchema);
