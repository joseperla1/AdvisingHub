const gen = require('../src/utils/codeGenerator');

describe('codeGenerator', () => {
  test('generates <= 20 char codes with expected prefixes', () => {
    const u = gen.userCode();
    const s = gen.serviceCode();
    const q = gen.queueCode();
    const qe = gen.queueEntryCode();
    const a = gen.appointmentCode();
    const e = gen.eventCode();

    expect(u.startsWith('usr')).toBe(true);
    expect(s.startsWith('svc')).toBe(true);
    expect(q.startsWith('q')).toBe(true);
    expect(qe.startsWith('qe')).toBe(true);
    expect(a.startsWith('apt')).toBe(true);
    expect(e.startsWith('evt')).toBe(true);

    [u, s, q, qe, a, e].forEach((x) => {
      expect(typeof x).toBe('string');
      expect(x.length).toBeLessThanOrEqual(20);
      expect(x.length).toBeGreaterThan(3);
    });
  });
});

