const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    username: { type: String },
    fullname: { type: String },
    phone: { type: String },
    isAdmin: { type: Boolean, default: false }
  },
  { timestamps: true } // Bật timestamps để tự động thêm createdAt và updatedAt
);

module.exports = mongoose.model("User", userSchema);