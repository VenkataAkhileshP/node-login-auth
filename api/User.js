const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require("bcrypt");

require('dotenv').config();
// mongodb user model
const User = require("./../models/User");

const GENDERS = ["Male", "Female", "Other"];
const JWT_EXPIRY = 3600 * 24;      // 1 day
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'kjfksfsdjflkdsjflkjsdlfkjhsdlkfj@#*(&@*!^#&@gfdsfdsf';

// Signup
router.post("/signup", async (req, res) => {
  const { email, name, contact, address, gender, country } = req.body;

  if (!name || !email || !req.body.password || !contact || !address || !gender || !country ) {
    return res.status(400).json({
      status: "FAILED",
      message: "Empty input fields!",
    });
  }

  if (req.body.password.length < 8) {
    return res.status(400).json({
      status: "FAILED",
      message: "Password is too short!",
    });
  }

  let hashedPassword = '';
  try {
    hashedPassword = await bcrypt.hash(req.body.password, 10);
  } catch(err) {
    return res.status(400).json({
      status: "FAILED",
      message: "Please try again!",
      errorMessage: err.message
    });
  }
  delete req.body.password;

  if (!GENDERS.includes(gender)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Please select one of the given options",
    });
  }

  if (!/^[1-9]{1}[0-9]{9}$/.test(contact)) {
    return res.status(400).json({
      status: "FAILED",
      message: "Invalid contact entered",
    });
  }

  if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    return res.json({
      status: "FAILED",
      message: "Invalid email entered",
    });
  }

  try {
    const records = await User.find({ email });
    if (records.length) {
      return res.json({
        status: "FAILED",
        message: "User with the email already exists",
      });
    }
  } catch(err) {
    return res.status(400).send({ errorMessage: err.message });
  }

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    contact: String(contact),
    address,
    gender,
    country,
  });

  let result;
  try {
    result = await newUser.save();
  } catch(err) {
    return res.status(400).send({ errorMessage: err.message });
  }

  result.password = null;
  let token;
  try {
    token = jwt.sign({
      id: result._id,
      name: result.name,
      email: result.email,
      contact: result.contact
    }, JWT_SECRET_KEY, { expiresIn: 3600*24 });
  } catch(err) {
    return res.status(400).json({
      status: "FAILED",
      message: "Please try again!",
      errorMessage: err.message
    });
  }

  return res.status(201).json({
    status: "SUCCESS",
    message: "Signup successful",
    autorizationToken: token
  });
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let record;

  if (!email || !password ) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provide all the credentials!",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      status: "FAILED",
      message: "Password is too short!",
    });
  }

  let isAuthorised = false;
  try {
    record = await User.find({ email });
    if (record.length < 1) {
      return res.status(400).json({
        status: "FAILED",
        message: "User doesn't exists",
      });
    }

    isAuthorised = await bcrypt.compare(password, record[0].password);
  } catch(err) {
    return res.status(400).json({
      status: "FAILED",
      message: "Please try again!",
      errorMessage: err.message
    });
  }

  record[0].password = null;
  let token;
  try {
    token = jwt.sign({
      id: record[0]._id,
      name: record[0].name,
      email: record[0].email,
      contact: record[0].contact
    }, JWT_SECRET_KEY, { expiresIn: 3600*24 });
  } catch(err) {
    return res.status(400).json({
      status: "FAILED",
      message: "Please try again!",
      errorMessage: err.message
    });
  }

  if (isAuthorised) {
    return res.json({
      status: "SUCCESS",
      message: "Logged in successful",
      autorizationToken: token
    });
  }

  return res.status(400).json({
    status: "FAILED",
    message: "Please provide valid credentials"
  });
});

// Search
router.get("/search", async (req, res) => {
  const { authorization } = req.headers;
  const { name } = req.query;
  const contact = req.query.contact ? String(req.query.contact) : null ;
  let results = [];

  const tokenDecoded = jwt.verify(authorization, JWT_SECRET_KEY);

  if (!tokenDecoded || !tokenDecoded.id) {
    return res.status(400).json({
      status: "FAILED",
      message: "Unautorized user",
    });
  }

  if (!name && !contact ) {
    return res.status(400).json({
      status: "FAILED",
      message: "Provide required info!",
    });
  }

  try {
    if (name) {
      results = await User.find({ name: { $regex: name, $options: 'i' } }, 'name email contact address gender country').exec();
    } else if (contact) {
      results = await User.find({ contact: { $regex: contact } }, 'name email contact address gender country').exec();
    }
  } catch(err) {
    return res.status(400).json({
      status: "FAILED",
      message: "Please try again",
      errorMessage: err.message
    });
  }

  results = results.filter((result) => result._id && tokenDecoded && tokenDecoded.id && result._id != tokenDecoded.id);

  if (results.length < 1) {
    return res.status(200).json({
      status: "SUCCESS",
      message: "No results found for the given input",
    });
  }

  return res.status(200).json({
    status: "SUCCESS",
    message: "Here are requested users",
    data: results
  });
});

// Logout
router.get("/logout", async (req, res) => {
  const tokenDecoded = jwt.verify(authorization, JWT_SECRET_KEY);

  if (!tokenDecoded || !tokenDecoded.id) {
    return res.status(400).json({
      status: "FAILED",
      message: "Unautorized user",
    });
  }

  return res.status(200).json({
    status: "SUCCESS",
    message: "User is successfully logged out"
  });
});

module.exports = router;
