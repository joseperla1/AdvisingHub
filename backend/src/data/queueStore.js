const queueItems = [
  {
    id: 'q1',
    userId: 'u101',
    name: 'John Smith',
    studentId: 'STU001',
    serviceId: 'svc1',
    serviceName: 'Transcript Request',
    priority: 'normal',
    status: 'waiting',
    joinedAt: '2026-03-24T18:00:00.000Z'
  },
  {
    id: 'q2',
    userId: 'u102',
    name: 'Ariana M.',
    studentId: 'STU002',
    serviceId: 'svc2',
    serviceName: 'Add/Drop',
    priority: 'normal',
    status: 'waiting',
    joinedAt: '2026-03-24T18:05:00.000Z'
  },
  {
    id: 'q3',
    userId: 'u103',
    name: 'Jordan S.',
    studentId: 'STU003',
    serviceId: 'svc3',
    serviceName: 'Graduation Check',
    priority: 'normal',
    status: 'waiting',
    joinedAt: '2026-03-24T18:10:00.000Z'
  }
];

module.exports = {
  queueItems
};