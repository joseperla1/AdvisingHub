describe('config/db requireEnv', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('requireEnv throws when missing', () => {
    delete process.env.DB_USER;
    const { requireEnv } = require('../src/config/db');
    expect(() => requireEnv('DB_USER')).toThrow(/Missing required environment variable/);
  });

  test('requireEnv returns trimmed value', () => {
    process.env.X = '  ok  ';
    const { requireEnv } = require('../src/config/db');
    expect(requireEnv('X')).toBe('  ok  ');
  });
});

