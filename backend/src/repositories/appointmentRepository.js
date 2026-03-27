const { appointments } = require('../data/appointmentsStore');

class AppointmentRepository {
  async findAll() {
    return [...appointments];
  }

  async findById(id) {
    return appointments.find(a => a.id === id) || null;
  }

  async findByStudentId(studentId) {
    return appointments.filter(a => a.studentId === studentId);
  }

  async create(appointment) {
    appointments.push(appointment);
    return appointment;
  }
}

module.exports = new AppointmentRepository();