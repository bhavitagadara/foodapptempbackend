  const Order = require("../models/order.model");
  const stripeOrder = require("../models/stripe.model"); // Ensure you import the correct model


// Create Order
  exports.createOrder = async (req, res) => {
      try {
          const { email, items } = req.body;

          if (!email || !items || items.length === 0) {
              return res.status(400).json({ error: "Invalid order data" });
          }

          // Convert price from string to number and validate quantity
          const sanitizedItems = items.map(item => ({
              name: item.name,
              price: parseFloat(item.price.replace(/[^0-9.]/g, "")), // Remove $ and convert to number
              quantity: Number(item.quantity) || 1 // Ensure quantity is a number, default to 1
          }));

          // Calculate total amount correctly
          const totalAmount = sanitizedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

          // Create new order
          const newOrder = new Order({ email, items: sanitizedItems, totalAmount });
          await newOrder.save();

          res.status(201).json({ message: "Order placed successfully", order: newOrder });
      } catch (error) {
          console.error("Error placing order:", error);
          res.status(500).json({ error: "Failed to place order", details: error.message });
      }
  };

  // Fetch Order History by Email
  exports.getOrderHistoryByEmail = async (req, res) => {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        // Fetch orders sorted by creation date (newest first)
        const orders = await stripeOrder
            .find({ email })
            .sort({ createdAt: -1 }) // Sort by latest order first
            .select("email items totalAmount paymentStatus createdAt isSubscription"); // Include isSubscription field

        if (!orders.length) {
            return res.status(404).json({ message: "No orders found for this email." });
        }

        res.status(200).json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Server error while fetching orders." });
    }
};
