const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  email: { type: String, required: true }, // Ensure email is required
  items: [
    {
      name: { type: String, required: true },
      price: { type: Number, required: true },  // Price should be a number
      quantity: { type: Number, required: true },
      image: { type: String }
    },
  ],
  totalAmount: { type: Number, required: true },  // Ensure it's a number
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
