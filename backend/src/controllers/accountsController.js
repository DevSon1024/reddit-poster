const { getAllAccounts } = require('../services/redditService');

async function getAccounts(req, res) {
  try {
    const accounts = getAllAccounts();
    const usernames = accounts.map(acc => acc.username);
    return res.json(usernames);
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(500).json({ message: 'accounts.json not found.' });
    }
    return res.status(500).json({ message: `Error reading accounts: ${err.message}` });
  }
}

module.exports = {
  getAccounts,
};
