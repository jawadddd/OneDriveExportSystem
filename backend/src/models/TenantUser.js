const mongoose = require("mongoose");

const tenantUserSchema = new mongoose.Schema(
  {
    azureId: { type: String, required: true },
    displayName: String,
    email: String,
    userPrincipalName: String,
    jobTitle: String,
    department: String,
    accountEnabled: Boolean,
    driveId: String,
    fetchedAt: { type: Date, default: Date.now },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  },
  { timestamps: true }
);

tenantUserSchema.index({ azureId: 1, adminId: 1 }, { unique: true });

module.exports = mongoose.model("TenantUser", tenantUserSchema);
