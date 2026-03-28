const express = require('express');
const cors = require('cors');

const adminQueueRoutes = require('./routes/adminQueueRoutes');
const queueRoutes = require('./routes/queueRoutes');
const serviceCatalogRoutes = require('./routes/serviceCatalogRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const adminAppointmentRoutes = require('./routes/adminAppointmentRoutes');
const historyRoutes = require('./routes/historyRoutes');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is running'
  });
});

app.use('/api/admin/queue', adminQueueRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/services', serviceCatalogRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin/appointments', adminAppointmentRoutes);
app.use('/api/history', historyRoutes);


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