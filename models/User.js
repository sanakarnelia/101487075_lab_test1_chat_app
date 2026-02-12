const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  firstname: { type: String, required: true, trim: true },
  lastname: { type: String, required: true, trim: true },
  password: { type: String, required: true }, 
  createon: { type: String, required: true }  
});

module.exports = mongoose.model("User", userSchema);
