const services = [
  {
    id: 'svc1',
    name: 'Transcript Request',
    description: 'Official and unofficial transcript processing.',
    expectedDurationMin: 10,
    priority: 'normal'
  },
  {
    id: 'svc2',
    name: 'Enrollment Verification',
    description: 'Verification of enrollment for employers or agencies.',
    expectedDurationMin: 8,
    priority: 'low'
  },
  {
    id: 'svc3',
    name: 'Graduation Check',
    description: 'Degree audit and graduation readiness review.',
    expectedDurationMin: 20,
    priority: 'high'
  },
  {
    id: 'svc4',
    name: 'General Advising',
    description: 'General academic advising and registration support.',
    expectedDurationMin: 15,
    priority: 'normal'
  }
];

module.exports = {
  services
};