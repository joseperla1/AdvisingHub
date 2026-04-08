function buildMockRequest() {
  const req = {
    input: jest.fn(() => req),
    query: jest.fn(async () => ({ recordset: [], rowsAffected: [1] })),
  };
  return req;
}

function buildMockPool() {
  return {
    request: jest.fn(() => buildMockRequest()),
  };
}

module.exports = {
  buildMockRequest,
  buildMockPool,
};

