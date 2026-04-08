const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('../src/routes/auth.routes');
jest.mock('../src/services/user.service', () => ({
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
}));
const userService = require('../src/services/user.service');

const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registration requires email and password', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: '', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('registration fails if email already exists', async () => {
    userService.findUserByEmail.mockResolvedValue({ userId: 1, userCode: 'usr1', email: 'user@example.com', passwordHash: 'hash', role: 'user' });
    const res = await request(app).post('/api/auth/register').send({ email: 'user@example.com', password: 'password' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('successful registration returns token and user', async () => {
    userService.findUserByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({ id: 'usr_new', email: 'newuser@example.com', role: 'user', name: 'New User', studentId: null });
    const res = await request(app).post('/api/auth/register').send({ email: 'newuser@example.com', password: 'password', name: 'New User' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('newuser@example.com');
  });

  test('login requires email and password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: '', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('login fails with wrong password', async () => {
    userService.findUserByEmail.mockResolvedValue({
      userId: 1,
      userCode: 'usr1',
      email: 'user@example.com',
      passwordHash: '$2b$10$D9vk5HOBvl3h1NIhmxBZWuBEVi2KI6O4rhDuCQWmTr289O3v/Fkbu',
      role: 'user',
    });
    const res = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('login succeeds with correct credentials', async () => {
    userService.findUserByEmail.mockResolvedValue({
      userId: 1,
      userCode: 'usr1',
      email: 'user@example.com',
      passwordHash: '$2b$10$D9vk5HOBvl3h1NIhmxBZWuBEVi2KI6O4rhDuCQWmTr289O3v/Fkbu',
      role: 'user',
    });
    userService.findUserById.mockResolvedValue({ id: 'usr1', name: 'User Name', studentId: '20260001' });
    const res = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'password' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('user@example.com');
  });
});
