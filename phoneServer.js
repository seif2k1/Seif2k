const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const twilio = require("twilio");
const bcrypt = require("bcrypt");
const app = express();
const jwt = require("jsonwebtoken");
const port = 3005;
const { body, validationResult } = require("express-validator");
const cors = require("cors");

app.use(bodyParser.json());
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Replace with your MongoDB connection string
const mongoURI =
  "mongodb+srv://seif22k:GDKvfAV3wLUjnM3d@cluster0.fjxldwr.mongodb.net/?retryWrites=true&w=majority";
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB", err));

const User = require("./models/phoneUser");

// Twilio configuration
const accountSid = "AC94c1e83b130129cb746d339a70e2db4e";
const authToken = "dd8d8a60113cae1a9d174ab63126394c";
const twilioClient = twilio(accountSid, authToken);

// Generate random code
const generateRandomCode = () => {
  return Math.floor(Math.random() * 6000).toString();
};

// Sign up
app.post(
  "/register",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("email").notEmpty().withMessage("Email is required"),
    body("password").notEmpty().withMessage("Password is required"),
    body("phoneNumber").notEmpty().withMessage("Phone Number is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, email, phoneNumber } = req.body;

    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const existingPhoneNumber = await User.findOne({ phoneNumber });
      if (existingPhoneNumber) {
        return res.status(400).json({ message: "Phone Number already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        username,
        email,
        phoneNumber,
        password: hashedPassword,
      });

      await newUser.save();

      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      res.status(500).json({ message: "An error occurred" });
    }
  }
);

// Login Endpoint
app.post("/login", async (req, res) => {
  const { password, email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, "seif2ks1"); // Replace with your secret key
    res.json({ token, userID: user._id });
  } catch (error) {
    res.status(500).json({ message: "An error occurred" });
  }
});

app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});
// Route to request a password reset
app.post(
  "/forgot-password",
  [
    body("phoneNumber").notEmpty().withMessage("phoneNumber is required"),
    body("email").notEmpty().withMessage("Email is required"),
  ],
  async (req, res) => {
    const { email, phoneNumber } = req.body;

    try {
      const user = await User.findOne({ email, phoneNumber });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const resetCode = generateRandomCode();
      user.resetCode = resetCode;
      await user.save();

      // Send SMS with reset code using Twilio
      await twilioClient.messages.create({
        body: `Your password reset code is: ${resetCode}`,
        to: user.phoneNumber, // User's phone number
        from: "+17063074520", // Your Twilio phone number
      });

      res.json({ message: "Password reset code sent successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);
app.post("/reset-password", async (req, res) => {
  const { email, resetCode, newPassword } = req.body;

  try {
    const user = await User.findOne({ email, resetCode });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found or invalid reset code" });
    }
    function isResetCodeExpired(user) {
      // Assuming 'user.resetCodeExpiration' is a Date field in the user document
      // that stores the expiration time of the reset code
      const now = new Date();
      return user.resetCodeExpiration <= now;
    }

    // Check if reset code is expired (you need to implement this logic)
    if (isResetCodeExpired(user)) {
      return res.status(400).json({ message: "Reset code has expired" });
    }

    // Hash the new password and update it in the user's document
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetCode = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// Route to get user information by ID
app.get("/users/:_id", async (req, res) => {
  try {
    const userId = req.params._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.put("/users/:_id", async (req, res) => {
  const userId = req.params._id;
  const updatedInfo = req.body;

  try {
    // Find the user by ID and update their information
    const updatedUser = await User.findByIdAndUpdate(userId, updatedInfo, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
