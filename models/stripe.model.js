
const mongoose = require("mongoose");

const stripeOrderSchema = new mongoose.Schema({
    email: { type: String, required: true },
    items: { type: Array, required: true, default: [] },
    totalAmount: { type: Number, required: true },
    transactionId: { type: String, required: true },
    paymentStatus: { type: String, required: true },
    isSubscription: { type: Boolean, required: true, default: false } 
}, { timestamps: true }); // ✅ Adds createdAt and updatedAt timestamps

module.exports = mongoose.model("stripeOrder", stripeOrderSchema);
