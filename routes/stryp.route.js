const express = require("express");
const { payment, success ,cancelOrder , createSubscription , cancelSubscription} = require("../controllers/stripe.controller"); // Ensure correct import

const router = express.Router();

router.post("/create-payment-session", payment); // Function must match the controller
router.post("/orders",success);
router.post("/orders/:orderId/cancel", cancelOrder);
router.post("/subscribe", createSubscription);
router.post("/subscriptions/:orderId/cancel",cancelSubscription);

module.exports = router;
