/**
 * Seed users aligned with queueStore / appointmentsStore for MySQL migration.
 * Password for all seed accounts (dev only): "password"
 */
const bcrypt = require('bcryptjs');

const DEV_PASSWORD = 'password';
const hash = () => bcrypt.hashSync(DEV_PASSWORD, 10);

const seedUserDefs = [
  {
    id: 'adm1',
    email: 'admin@example.com',
    name: 'Admin Smith',
    role: 'admin',
    studentId: null,
  },
  {
    id: 'adm2',
    email: 'advisor2@example.com',
    name: 'Jordan Chen',
    role: 'admin',
    studentId: null,
  },
  {
    id: 'u101',
    email: 'john.smith@student.edu',
    name: 'John Smith',
    role: 'user',
    studentId: 'STU001',
  },
  {
    id: 'u102',
    email: 'ariana.m@student.edu',
    name: 'Ariana M.',
    role: 'user',
    studentId: 'STU002',
  },
  {
    id: 'u103',
    email: 'jordan.s@student.edu',
    name: 'Jordan S.',
    role: 'user',
    studentId: 'STU003',
  },
];

function buildSeedUsers() {
  return seedUserDefs.map(u => ({
    id: u.id,
    email: u.email.toLowerCase(),
    passwordHash: hash(),
    name: u.name,
    role: u.role,
    studentId: u.studentId ?? null,
  }));
}

module.exports = {
  buildSeedUsers,
  seedUserDefs,
  DEV_PASSWORD,
};
