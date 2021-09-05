
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contact: { type: String, required: true },
    address: { type: String },
    gender: { type: String, required: true },
    country: { type: String }
  }
);

const User = mongoose.model('User', UserSchema);

module.exports = User;