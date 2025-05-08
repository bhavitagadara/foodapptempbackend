const express = require("express");
const { createOrder, getOrderHistoryByEmail } = require("../controllers/order.controller");

const router = express.Router();

// Place a new order
router.post("/placeorder", createOrder);
// router.post("/orders", createOrder);
// Get Order History by Email
router.get("/orderhistory/:email", getOrderHistoryByEmail);

module.exports = router;
