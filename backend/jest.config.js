/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/src/__tests__/**/*.test.js"],
  clearMocks: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/features/**/*.js",
    "src/middleware/**/*.js",
    "src/utils/**/*.js",
  ],
};
