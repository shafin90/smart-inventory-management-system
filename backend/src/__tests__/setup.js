// Shared test environment setup — mock all I/O before any module loads

jest.mock("../db/postgres", () => ({
  // Default: always return { rows: [] } unless overridden with mockResolvedValueOnce
  query: jest.fn().mockResolvedValue({ rows: [] }),
  getClient: jest.fn(),
}));

jest.mock("../db/redis", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
}));

jest.mock("../queue/rabbitmq", () => ({
  connectQueue: jest.fn().mockResolvedValue(undefined),
  getChannel: jest.fn().mockReturnValue(null),
  publishRestockEvent: jest.fn(),
}));

jest.mock("../features/activity/service/activityService", () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
  getRecentActivities: jest.fn().mockResolvedValue([]),
}));
