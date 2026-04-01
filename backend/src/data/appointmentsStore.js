/**
 * Appointments tied to seed users (userId / studentId / names).
 */
const appointments = [
  {
    id: 'apt1',
    userId: 'u102',
    studentName: 'Ariana M.',
    studentId: 'STU002',
    serviceId: 'svc2',
    serviceName: 'Enrollment Verification',
    appointmentDate: '2026-03-28',
    appointmentTime: '14:30',
    advisorId: 'adm1',
    advisor: 'Admin Smith',
    status: 'Checked In',
    queuePosition: 2,
    notes: 'Bring verification form',
  },
  {
    id: 'apt2',
    userId: 'u103',
    studentName: 'Jordan S.',
    studentId: 'STU003',
    serviceId: 'svc3',
    serviceName: 'Graduation Check',
    appointmentDate: '2026-03-29',
    appointmentTime: '10:00',
    advisorId: 'adm1',
    advisor: 'Admin Smith',
    status: 'Scheduled',
    queuePosition: 1,
  },
  {
    id: 'apt3',
    userId: 'u101',
    studentName: 'John Smith',
    studentId: 'STU001',
    serviceId: 'svc4',
    serviceName: 'General Advising',
    appointmentDate: '2026-03-30',
    appointmentTime: '11:00',
    advisorId: 'adm1',
    advisor: 'Admin Smith',
    status: 'Scheduled',
    queuePosition: null,
    notes: 'Degree planning follow-up',
  },
];

module.exports = {
  appointments,
};
