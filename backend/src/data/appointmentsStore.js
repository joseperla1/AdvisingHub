const appointments = [
  {
    id: 'apt1',
    studentName: 'Ariana M.',
    studentId: 'STU002',
    serviceId: 'svc2',
    serviceName: 'Enrollment Verification',
    appointmentDate: '2026-03-28',
    appointmentTime: '14:30',
    advisor: 'Advisor Smith',
    status: 'Checked In',
    queuePosition: 2,
    notes: 'Bring verification form'
  },
  {
    id: 'apt2',
    studentName: 'Jordan S.',
    studentId: 'STU003',
    serviceId: 'svc3',
    serviceName: 'Graduation Check',
    appointmentDate: '2026-03-29',
    appointmentTime: '10:00',
    advisor: 'Advisor Smith',
    status: 'Scheduled',
    queuePosition: 1
  }
];

module.exports = {
  appointments
};