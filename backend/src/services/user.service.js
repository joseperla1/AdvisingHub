const bcrypt = require('bcryptjs');

// In-memory storage (no database yet)
let users = [
  {
    id: '1',
    email: 'admin@example.com',
    passwordHash: bcrypt.hashSync('password', 10),
    name: 'Admin User',
    role: 'admin'
  },
  {
    id: '2',
    email: 'admin2@example.com',
    passwordHash: bcrypt.hashSync('password', 10),
    name: 'Admin User 2',
    role: 'admin'
  },
  {
    id: '3',
    email: 'admin3@example.com',
    passwordHash: bcrypt.hashSync('password', 10),
    name: 'Admin User 3',
    role: 'admin'
  },
  {
    id: '4',
    email: 'user@example.com',
    passwordHash: bcrypt.hashSync('password', 10),
    name: 'Regular User',
    role: 'user'
  },
  {
    id: '5',
    email: 'user2@example.com',
    passwordHash: bcrypt.hashSync('password', 10),
    name: 'Regular User 2',
    role: 'user'
  },
  {
    id: '6',
    email: 'user3@example.com',
    passwordHash: bcrypt.hashSync('password', 10),
    name: 'Regular User 3',
    role: 'user'
  }
];

let nextUserId = 7;

const userService = {
  // Find user by email
  findUserByEmail: (email) => {
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  // Find user by ID
  findUserById: (id) => {
    return users.find(u => u.id === id);
  },

  // Create new user
  createUser: (userData) => {
    const passwordHash = bcrypt.hashSync(userData.password, 10);
    const newUser = {
      id: String(nextUserId++),
      email: userData.email,
      passwordHash,
      name: userData.name || userData.email,
      role: userData.role || 'user'
    };
    users.push(newUser);
    return newUser;
  },

  // Get all users (for admin purposes)
  getAllUsers: () => {
    return users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role
    }));
  },

  // Update user
  updateUser: (id, updates) => {
    const user = users.find(u => u.id === id);
    if (!user) return null;
    
    Object.assign(user, updates);
    return user;
  }
};

module.exports = userService;
