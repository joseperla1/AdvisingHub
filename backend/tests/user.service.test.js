const userService = require('../src/services/user.service');
const bcrypt = require('bcryptjs');

describe('User Service', () => {
  beforeEach(() => {
    // Reset users to initial state
    // (No-op for now, as in-memory users are static)
  });

  test('findUserByEmail returns correct user', () => {
    const user = userService.findUserByEmail('user@example.com');
    expect(user).toBeDefined();
    expect(user.email).toBe('user@example.com');
  });

  test('findUserById returns correct user', () => {
    const user = userService.findUserById('4');
    expect(user).toBeDefined();
    expect(user.email).toBe('user@example.com');
  });

  test('createUser adds a new user', () => {
    const newUser = userService.createUser({ email: 'test@x.com', password: 'pw', name: 'Test' });
    expect(newUser).toBeDefined();
    expect(newUser.email).toBe('test@x.com');
    expect(bcrypt.compareSync('pw', newUser.passwordHash)).toBe(true);
  });

  test('updateUser updates user fields', () => {
    const user = userService.createUser({ email: 'update@x.com', password: 'pw', name: 'Update' });
    const updated = userService.updateUser(user.id, { name: 'Updated Name' });
    expect(updated.name).toBe('Updated Name');
  });

  test('getAllUsers returns array', () => {
    const users = userService.getAllUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBeGreaterThan(0);
  });
});
