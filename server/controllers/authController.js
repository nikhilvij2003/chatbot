const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user' });
  }
};

const login = async (req, res) => {
  console.log("Login request received:", req.body); // Log incoming request data
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email); // Log if user is not found
      return res.status(400).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", isMatch); // Log password match result
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = user.refreshToken; // Get the refresh token from the user
    console.log("JWT token generated:", token); // Log generated token
    res.json({ token, refreshToken, user }); // Include refresh token in the response
  } catch (error) {
    res.status(500).json({ message: 'Error logging in user' });
  }
};

module.exports = { register, login };
