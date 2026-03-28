const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const adminQueueRoutes = require('./routes/adminQueueRoutes');
const queueRoutes = require('./routes/queueRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/queue', adminQueueRoutes);
app.use('/api/queue', queueRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// global error handler
app.use((err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

module.exports = app;