import jwt from 'jsonwebtoken';

export const register = (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY });
    res.json({ token, email });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY });
    res.json({ token, email });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

export const logout = (req, res) => {
  res.json({ message: 'Logged out successfully' });
};

export const getMe = (req, res) => {
  res.json({ user: req.user });
};
