const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY || "my-super-extra-secret-key";

// NORMAL USER AUTHENTICATION
exports.postSignup = async (req, res, next) => {
  try {
    const { email, password, username, fullname, phone } = req.body;
    
    // Validation
    if (!email || !password || !email.includes("@") || password.length < 6) {
      return res.status(401).json({ error: "Please enter a valid email or password" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(401).json({ error: "Email already exists. Please choose another email." });
    }

    const encryptedPass = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: encryptedPass,
      username,
      fullname,
      phone,
      isAdmin: false
    });

    await newUser.save();
    return res.status(200).json({ message: "Signup successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    const passwordCheck = await bcrypt.compare(password, user.password);
    if (!passwordCheck) {
      return res.status(401).json({ error: "Password is incorrect." });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY);
    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        phone: user.phone,
        isLogin: true
      },
      token: token
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// ADMIN USER AUTHENTICATION
exports.postAdminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isAdmin: true });
    
    if (!user) {
      return res.status(401).json({ error: "Admin user not found." });
    }

    const passwordCheck = await bcrypt.compare(password, user.password);
    if (!passwordCheck) {
      return res.status(401).json({ error: "Password is incorrect." });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY);
    return res.status(200).json({
      adminUser: {
        id: user._id,
        email: user.email,
        fullname: user.fullname,
        phone: user.phone,
        isLogin: true,
        isAdmin: true
      },
      adminToken: token
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.postAdminSignup = async (req, res, next) => {
  try {
    const { email, password, username, fullname, phone } = req.body;

    if (!email || !password || !email.includes("@") || password.length < 6) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isAdmin) {
        return res.status(401).json({ error: "Admin user already exists." });
      } else {
        return res.status(401).json({ error: "Email already used by a normal user. Please use another email." });
      }
    }

    const encryptedPass = await bcrypt.hash(password, 10);
    const newUser = new User({
      email,
      password: encryptedPass,
      username,
      fullname,
      phone,
      isAdmin: true
    });

    await newUser.save();
    return res.status(200).json({ message: "Admin signup successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
