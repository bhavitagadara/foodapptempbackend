const User = require("../models/user.model");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");

const client = new OAuth2Client("1069643438794-p8f7rgjgsgkgale7ntjv2fvrdu6fekad.apps.googleusercontent.com");

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Validate password
        if (user.password !== password) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        res.status(200).json({ message: "Login successful", user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Token is required" });
        }

        // Verify Google Token
        let ticket;
        try {
            ticket = await client.verifyIdToken({
                idToken: token,
                audience: "1069643438794-p8f7rgjgsgkgale7ntjv2fvrdu6fekad.apps.googleusercontent.com",
            });
        } catch (err) {
            console.error("Google Token Verification Error:", err);
            return res.status(400).json({ message: "Invalid Google token", error: err.message });
        }

        const payload = ticket.getPayload();
        console.log("Google Payload:", payload);

        const { email, name, sub, picture } = payload;

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            console.log("User not found, creating a new one...");

            // Create a new user if they don’t exist
            user = new User({
                name,
                email,
                googleId: sub,
                profilePicture: picture,
            });

            await user.save();
        } else if (!user.googleId) {
            // If user exists but does not have a Google ID, update it
            user.googleId = sub;
            await user.save();
        }

        // Generate JWT Token
        const jwtToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || "mnbvcxzlkjhgfdsapoiuytrewq123456", // Use a secure secret key
            { expiresIn: "30d" }
        );

        return res.json({ user, token: jwtToken });
    } catch (error) {
        console.error("Google Login Error:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}
