/**
 * Service catalog — aligns with DB Service table (id, name, description, duration, priority).
 */
const services = [
  {
    id: 'svc1',
    name: 'Transcript Request',
    description: 'Official and unofficial transcript processing.',
    expectedDurationMin: 10,
    priority: 'normal',
  },
  {
    id: 'svc2',
    name: 'Enrollment Verification',
    description: 'Verification of enrollment for employers or agencies.',
    expectedDurationMin: 8,
    priority: 'low',
  },
  {
    id: 'svc3',
    name: 'Graduation Check',
    description: 'Degree audit and graduation readiness review.',
    expectedDurationMin: 20,
    priority: 'high',
  },
  {
    id: 'svc4',
    name: 'General Advising',
    description: 'Course planning, registration help, and academic holds.',
    expectedDurationMin: 15,
    priority: 'normal',
  },
  {
    id: 'svc5',
    name: 'Major Change',
    description: 'Program change requirements and eligibility discussion.',
    expectedDurationMin: 25,
    priority: 'normal',
  },
  {
    id: 'svc6',
    name: 'Academic Standing Support',
    description: 'Probation, success planning, and reinstatement guidance.',
    expectedDurationMin: 35,
    priority: 'high',
  },
  {
    id: 'svc7',
    name: 'Computer Science Advising',
    description: 'CS major requirements, prerequisites, and degree path.',
    expectedDurationMin: 30,
    priority: 'normal',
  },
  {
    id: 'svc8',
    name: 'Financial Aid Support',
    description: 'FAFSA, appeals, and aid eligibility questions.',
    expectedDurationMin: 20,
    priority: 'normal',
  },
  {
    id: 'svc9',
    name: 'Registration Help',
    description: 'Course add/drop, waitlists, and registration errors.',
    expectedDurationMin: 15,
    priority: 'low',
  },
];

module.exports = {
  services,
};
