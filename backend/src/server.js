const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});

const app = require('./app');
const { getPool } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Optional: test database connection on startup
    const pool = await getPool();
     const result = await pool.request().query(`
      SELECT TOP 5 * FROM services
    `);
    console.log('Sample query result:', result.recordset);
    console.log('Database connected successfully');
    console.log('DB_SERVER:', process.env.DB_SERVER || process.env.DB_HOST);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();