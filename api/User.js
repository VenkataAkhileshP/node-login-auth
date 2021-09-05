const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken');
// Password handler
const bcrypt = require("bcrypt");

// mongodb user model
const User = require("./../models/User");

const GENDERS = ["Male", "Female", "Other"];

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
      error: err
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
    return res.status(400).send(err);
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
    return res.status(400).send(err);
  }

  return res.status(201).json({
    status: "SUCCESS",
    message: "Signup successful"
  });
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

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
    const record = await User.find({ email });
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
      error: err
    });
  }

  if (isAuthorised) {
    return res.json({
      status: "SUCCESS",
      message: "Logged in successful"
    });
  }

  return res.status(400).json({
    status: "FAILED",
    message: "Please provide valid credentials"
  });
});

// Search
router.get("/search", async (req, res) => {
  const { name } = req.query;
  const contact = req.query.contact ? String(req.query.contact) : null ;
  let results = [];

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
      error: err
    });
  }

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

module.exports = router;
