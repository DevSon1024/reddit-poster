const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { CSV_FILE } = require('../config/constants');

function getUsers() {
  if (!fs.existsSync(CSV_FILE)) {
    return [];
  }

  const fileContent = fs.readFileSync(CSV_FILE, 'utf-8');
  if (!fileContent.trim()) {
    return [];
  }

  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records;
}

function getUserMap() {
  try {
    const users = getUsers();
    const userMap = {};
    for (const u of users) {
      if (u.Username && u.Name) {
        userMap[u.Username] = u.Name;
        userMap[u.Username.toLowerCase()] = u.Name;
      }
    }
    return userMap;
  } catch (err) {
    console.error('Error getting user map:', err);
    return {};
  }
}

function getValidUsersMap() {
  try {
    const users = getUsers();
    const map = new Map();
    for (const u of users) {
      if (u.Username && u.Name) {
        const key = u.Username.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            Name: u.Name.trim(),
            Username: u.Username.trim(),
          });
        }
      }
    }
    return map;
  } catch (err) {
    console.error('Error getting valid users map:', err);
    return new Map();
  }
}

function findUserByUsername(username) {
  if (!username) return null;
  const search = username.trim().toLowerCase();
  const validMap = getValidUsersMap();
  return validMap.get(search) || null;
}

function getSortedUsers() {
  const users = getUsers();
  return users
    .filter(u => u.Username && u.Name)
    .map(u => ({
      canonicalUsername: u.Username.trim(),
      name: u.Name.trim(),
      lowerUsername: u.Username.trim().toLowerCase(),
    }))
    .sort((a, b) => b.lowerUsername.length - a.lowerUsername.length);
}

function matchUserForFilename(filename, sortedUsers = null) {
  if (!filename) return null;
  const list = sortedUsers || getSortedUsers();
  const baseName = path.parse(path.basename(filename)).name.toLowerCase();

  for (const user of list) {
    if (
      baseName === user.lowerUsername ||
      baseName.startsWith(user.lowerUsername + '_') ||
      baseName.startsWith(user.lowerUsername + '-') ||
      baseName.startsWith(user.lowerUsername + '.')
    ) {
      return user;
    }
  }

  return null;
}

function addUser(name, username) {
  let users = [];
  if (fs.existsSync(CSV_FILE)) {
    const fileContent = fs.readFileSync(CSV_FILE, 'utf-8');
    if (fileContent.trim()) {
      users = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    }
  }

  const exists = users.some(u => u.Username && u.Username.toLowerCase() === username.toLowerCase());
  if (exists) {
    const error = new Error(`Username '${username}' already exists.`);
    error.status = 409;
    throw error;
  }

  users.push({ Name: name, Username: username });

  // Sort alphabetically by Name (case-insensitive)
  users.sort((a, b) => (a.Name || '').toLowerCase().localeCompare((b.Name || '').toLowerCase()));

  const output = stringify(users, {
    header: true,
    columns: ['Name', 'Username'],
  });

  fs.writeFileSync(CSV_FILE, output, 'utf-8');
  return true;
}

module.exports = {
  getUsers,
  getUserMap,
  getValidUsersMap,
  getSortedUsers,
  findUserByUsername,
  matchUserForFilename,
  addUser,
};
