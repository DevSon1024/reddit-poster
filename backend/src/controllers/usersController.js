const userService = require('../services/userService');

async function getUsers(req, res) {
  try {
    const users = userService.getUsers();
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ message: `Error reading users CSV: ${err.message}` });
  }
}

async function addUser(req, res) {
  const { name, username } = req.body || {};

  if (!name || !username) {
    return res.status(400).json({ message: 'Name and Username are required.' });
  }

  try {
    userService.addUser(name, username);
    return res.json({ success: true, message: 'User added successfully.' });
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({ message: err.message });
    }
    return res.status(500).json({ message: `Failed to add user: ${err.message}` });
  }
}

module.exports = {
  getUsers,
  addUser,
};
