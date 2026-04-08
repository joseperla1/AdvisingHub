const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');

const userService = {
  /**
   * Returns credential record with passwordHash for auth.
   * Shape: { userId, userCode, email, passwordHash, role }
   */
  findUserByEmail: async (email) => {
    return userRepository.findCredentialByEmail(email);
  },

  /**
   * Returns user profile for app usage.
   * Shape: { id: user_code, email, role, name, studentId }
   */
  findUserById: async (userCode) => {
    return userRepository.findByUserCode(userCode);
  },

  /** First admin (default appointment advisor). */
  getDefaultAdvisor: async () => {
    return userRepository.findDefaultAdvisor();
  },

  createUser: async (userData) => {
    const passwordHash = bcrypt.hashSync(userData.password, 10);
    return userRepository.createUserWithProfile({
      email: userData.email,
      passwordHash,
      fullName: userData.name || userData.email,
      role: userData.role === 'admin' ? 'admin' : 'user',
    });
  },
};

module.exports = userService;
