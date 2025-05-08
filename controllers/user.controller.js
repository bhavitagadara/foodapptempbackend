const User = require("../models/user.model");

exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Debugging: Log received request body
        console.log("Received data:", req.body);

        // Check if any field is missing
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create new user
        const newUser = new User({ name, email, password });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully", newUser });
    } catch (err) {
        console.error("Error saving user:", err.message);
        res.status(500).json({ error: err.message });
    }
};
