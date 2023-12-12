const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  resetCode: { type: String },
  resetCodeExpiration: { type: Date },
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  resetTokenExpiration: { type: Date },
});
userSchema.methods.generateResetToken = function () {
  this.resetToken = crypto.randomBytes(20).toString("hex");
  this.resetTokenExpiry = Date.now() + 3600000; // Token expires in 1 hour
};

module.exports = mongoose.model("User", userSchema);
