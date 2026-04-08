function nextCode(prefix) {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${ts}${rand}`.slice(0, 20);
}

function userCode() {
  return nextCode('usr');
}

function serviceCode() {
  return nextCode('svc');
}

function queueCode() {
  return nextCode('q');
}

function queueEntryCode() {
  return nextCode('qe');
}

function appointmentCode() {
  return nextCode('apt');
}

function eventCode() {
  return nextCode('evt');
}

module.exports = {
  userCode,
  serviceCode,
  queueCode,
  queueEntryCode,
  appointmentCode,
  eventCode,
};
