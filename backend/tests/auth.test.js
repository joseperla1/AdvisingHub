const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('../src/routes/auth.routes');
const userService = require('../src/services/user.service');

const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRoutes);

describe('Auth API', () => {
  beforeEach(() => {
    // Reset users to initial state
    const users = userService.getAllUsers();
    users.forEach(u => {
      if (!['admin@example.com', 'admin2@example.com', 'admin3@example.com', 'user@example.com', 'user2@example.com', 'user3@example.com'].includes(u.email)) {
        userService.updateUser(u.id, { email: `deleted_${u.email}` });
      }
    });
  });

  test('registration requires email and password', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: '', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('registration fails if email already exists', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'user@example.com', password: 'password' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('successful registration returns token and user', async () => {
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
    const res = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('login succeeds with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'user@example.com', password: 'password' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('user@example.com');
  });
});
