const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String }, // Make password optional for Google login users
  googleId: { type: String, unique: true, sparse: true }, // Unique Google ID
  profilePicture: String, // Store profile picture URL
});

module.exports = mongoose.model("User", UserSchema);
