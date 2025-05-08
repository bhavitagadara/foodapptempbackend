const stripeOrder = require("../models/stripe.model");
const Stripe = require('stripe');


const stripe = new Stripe('sk_test_51QzFVmBo0wLbWohr7ui1xyQKUzmCrGRSld8dsxn0IuOaOOA5upSEQWvNyPcPk4OIFWQzVlQkmytvmph0IZK4h0gQ00Sqa8xN5r');

exports.payment = async (req, res) => {
    try {
        console.log("Received Payment Request:", req.body);

        const { email, items } = req.body;

        // Validate request data
        if (!email || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Invalid request data", received: req.body });
        }

        let totalAmount = 0;

        const lineItems = items.map((item) => {
            let price = item.price;

            // Convert price to a valid number (remove currency symbols)
            if (typeof price === "string") {
                price = parseFloat(price.replace(/[^0-9.]/g, ""));
            }

            // Validate price and quantity
            if (isNaN(price) || price <= 0 || !item.quantity || item.quantity <= 0) {
                console.error(`Invalid item data: ${JSON.stringify(item)}`);
                return res.status(400).json({ error: "Invalid item price or quantity", item });
            }

            // Calculate total amount
            totalAmount += price * item.quantity;

            return {
                price_data: {
                    currency: "usd",
                    product_data: { name: item.name || "Unnamed Item" },
                    unit_amount: Math.round(price * 100), // Convert to cents for Stripe
                },
                quantity: item.quantity,
            };
        });

        // Validate total amount before proceeding
        totalAmount = parseFloat(totalAmount.toFixed(2));

        if (totalAmount <= 0) {
            return res.status(400).json({ error: "Total amount is invalid" });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            customer_email: email,
            line_items: lineItems,
            mode: "payment",
            success_url: `http://localhost:4200/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: "http://localhost:4200/payment-cancel",
        });

        res.json({ url: session.url, sessionId: session.id, totalAmount });

    } catch (error) {
        console.error("Payment session creation failed:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.success = async (req, res) => {
    try {
        console.log("Received request at /orders with body:", req.body);

        const { session_id, items } = req.body;
        if (!session_id) {
            console.error("Missing session_id in request");
            return res.status(400).json({ error: "Session ID is required" });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);
        console.log("Stripe session retrieved:", session);

        if (!session) {
            return res.status(404).json({ error: "Payment session not found" });
        }

        const email = session.customer_email || session.customer_details?.email;
        const transactionId = session.payment_intent || session.subscription;

        if (!email || !transactionId) {
            console.error("Missing email or transaction ID:", { email, transactionId });
            return res.status(400).json({ error: "Missing email or transaction ID" });
        }

        const totalAmount = session.amount_total / 100;
        let orderItems = items || [];
        let isSubscription = false; // Default is false

        // If it's a subscription, retrieve product details and set isSubscription to true
        if (session.mode === "subscription" && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            console.log("Subscription details:", subscription);

            isSubscription = true; // Mark order as a subscription

            orderItems = await Promise.all(subscription.items.data.map(async (item) => {
                const product = await stripe.products.retrieve(item.plan.product);
                return {
                    name: product.name,
                    price: item.plan.amount / 100,
                    quantity: 1,
                    isSubscription: true // Mark item as a subscription
                };
            }));
        } else {
            // Mark individual items as non-subscription
            orderItems = orderItems.map(item => ({
                ...item,
                isSubscription: false
            }));
        }

        // Save the order with isSubscription flag
        const newOrder = new stripeOrder({
            email,
            items: orderItems,
            totalAmount,
            transactionId,
            paymentStatus: session.payment_status,
            date: new Date(),
            isSubscription // Store order-level subscription status
        });

        await newOrder.save();
        console.log("Order saved successfully");

        res.status(201).json({ message: "Order stored successfully" });

    } catch (error) {
        console.error("Error storing order:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        console.log("Canceling order with ID:", orderId);

        // Retrieve order from the database
        const order = await stripeOrder.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Ensure the order is not a subscription
        if (order.isSubscription) {
            return res.status(400).json({ error: "Cannot cancel a subscription order using this endpoint" });
        }

        // Check if the order was placed today
        const orderDate = new Date(order.createdAt);
        const today = new Date();
        if (
            orderDate.getFullYear() !== today.getFullYear() ||
            orderDate.getMonth() !== today.getMonth() ||
            orderDate.getDate() !== today.getDate()
        ) {
            return res.status(400).json({ error: "You can only cancel orders placed today" });
        }

        console.log("Stored Payment Intent ID:", order.transactionId);

        if (!order.transactionId) {
            return res.status(400).json({ error: "Payment Intent ID not found for this order" });
        }

        // Process refund via Stripe
        const refund = await stripe.refunds.create({
            payment_intent: order.transactionId,
        });

        // Update order status and ensure isSubscription is false
        order.paymentStatus = "refunded";
        order.isSubscription = false; // Ensures it's explicitly marked as false
        await order.save();

        res.json({ message: "Order canceled and payment refunded successfully", refund });
    } catch (error) {
        console.error("Error canceling order:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

exports.createSubscription = async (req, res) => {
    try {
        // Step 1: Create a dynamic price
        const price = await stripe.prices.create({
            unit_amount: 500, // Amount in cents ($5.00)
            currency: "usd",
            recurring: { interval: "day" }, // Charge daily
            product_data: {
                name: "Magnam Tiste" ,
            },
        });

        // Step 2: Create a Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            line_items: [
                {
                    quantity: 1,
                    price: price.id, // Use the dynamically created price
                },
            ],
            success_url: `http://localhost:4200/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: "http://localhost:4200/payment-cancel",
        });

        res.json({ url: session.url , sessionId: session.id});
    } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ error: error.message });
    }

};

exports.cancelSubscription = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await stripeOrder.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (!order.isSubscription || !order.transactionId) {
            return res.status(400).json({ message: "This order is not a valid subscription" });
        }

        if (order.paymentStatus === "canceled") {
            return res.status(400).json({ message: "Subscription is already canceled" });
        }

        // Cancel the Stripe subscription
        const cancel= await stripe.subscriptions.update(order.transactionId , {
            cancel_at_period_end: true,
          });
        console.log("Subscription canceled:", order.transactionId);

        // Update order status in the database
        order.paymentStatus = "canceled"; // Instead of "refunded", we mark it as "canceled"
        await order.save();

        return res.json({ message: "Subscription canceled successfully", cancel });

    } catch (error) {
        console.error("Error canceling subscription:", error);
        res.status(500).json({ message: "Server error" });
    }
};

