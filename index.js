const express = require("express");
const { connectToMongoDB } = require("./globel/connection");
const cors = require("cors");
require("dotenv").config();
const app = express();
const { connect, default: mongoose } = require("mongoose");
mongoose.set('strictQuery',false);
const bodyParser = require("body-parser");

const registerRoute = require("./routes/users.route")
const loginUser = require("./routes/login.route");
const orderRoutes = require("./routes/order.route");
const stripeRoute = require("./routes/stryp.route");

connectToMongoDB("mongodb://127.0.0.1:27017/foodapptemp",{
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(() => console.log('mongodb connected'));
  

  const corsOptions = {
    origin: ' http://localhost:4200', // Allow requests from this origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow these HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allow these headers 
    credentials: true 
  };
app.use(cors(corsOptions));
  
app.use(express.urlencoded({extended:false}))
app.use(bodyParser.json());
app.use(express.json());


// Routes
app.use("/",registerRoute);
app.use("/",loginUser);
app.use("/",orderRoutes);
app.use("/",stripeRoute);

const PORT = 9000;
app.listen(PORT, () => console.log(`Server Started at PORT:${PORT}`));