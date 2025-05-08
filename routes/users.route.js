const express = require("express");
const { registerUser } = require("../controllers/user.controller"); // Ensure correct import

const router = express.Router();

router.post("/register", registerUser); // Function must match the controller

module.exports = router;
