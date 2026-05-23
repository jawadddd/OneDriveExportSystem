const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    displayName: { type: String, required: true },
    organization: { type: String, default: "" },
    clientId: { type: String, required: true },
    clientSecret: { type: String, required: true },
    tenantId: { type: String, required: true },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

adminSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);
