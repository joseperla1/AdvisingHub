jest.mock('../src/repositories/userRepository', () => ({
  findCredentialByEmail: jest.fn(),
  findByUserCode: jest.fn(),
  findDefaultAdvisor: jest.fn(),
  createUserWithProfile: jest.fn(),
}));

const userRepository = require('../src/repositories/userRepository');
const userService = require('../src/services/user.service');

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findUserByEmail delegates to repository', async () => {
    userRepository.findCredentialByEmail.mockResolvedValue({
      userId: 1,
      userCode: 'usr1',
      email: 'user@example.com',
      passwordHash: 'hash',
      role: 'user',
    });
    const user = await userService.findUserByEmail('user@example.com');
    expect(userRepository.findCredentialByEmail).toHaveBeenCalledWith('user@example.com');
    expect(user.email).toBe('user@example.com');
  });

  test('findUserById delegates to repository', async () => {
    userRepository.findByUserCode.mockResolvedValue({
      id: 'usr1',
      email: 'user@example.com',
      role: 'user',
      name: 'User Name',
      studentId: '20260001',
    });
    const user = await userService.findUserById('usr1');
    expect(userRepository.findByUserCode).toHaveBeenCalledWith('usr1');
    expect(user.id).toBe('usr1');
  });

  test('createUser creates user with hashed password', async () => {
    userRepository.createUserWithProfile.mockResolvedValue({
      id: 'usr_new',
      email: 'test@x.com',
      role: 'user',
      name: 'Test',
      studentId: null,
    });
    const u = await userService.createUser({ email: 'test@x.com', password: 'pw', name: 'Test' });
    expect(userRepository.createUserWithProfile).toHaveBeenCalled();
    expect(u.email).toBe('test@x.com');
  });
});
