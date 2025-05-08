const express = require("express");
const { login , googleLogin } = require("../controllers/login.controller");  // Ensure correct import

const router = express.Router();

router.post("/login", login); // Function must match the controller
router.post("/google-login", googleLogin);

module.exports = router;
