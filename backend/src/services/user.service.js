const bcrypt = require('bcryptjs');
const { buildSeedUsers } = require('../data/usersSeed');

let users = buildSeedUsers();

function nextUserId() {
  const numeric = users
    .map(u => /^u(\d+)$/.exec(u.id))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10));
  const max = numeric.length ? Math.max(...numeric) : 100;
  return `u${max + 1}`;
}

const userService = {
  findUserByEmail: (email) => {
    return users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  },

  findUserById: (id) => {
    return users.find(u => u.id === id);
  },

  /** First admin (default appointment advisor). */
  getDefaultAdvisor: () => {
    return users.find(u => u.role === 'admin') || null;
  },

  createUser: (userData) => {
    const passwordHash = bcrypt.hashSync(userData.password, 10);
    const newUser = {
      id: nextUserId(),
      email: String(userData.email).toLowerCase(),
      passwordHash,
      name: userData.name || userData.email,
      role: userData.role === 'admin' ? 'admin' : 'user',
      studentId: userData.studentId || null,
    };
    users.push(newUser);
    return newUser;
  },

  getAllUsers: () => {
    return users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      studentId: u.studentId ?? null,
    }));
  },

  updateUser: (id, updates) => {
    const user = users.find(u => u.id === id);
    if (!user) return null;
    Object.assign(user, updates);
    return user;
  },
};

module.exports = userService;
