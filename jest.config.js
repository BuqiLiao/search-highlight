/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom", // 使用 jsdom 模拟浏览器环境
  setupFiles: ["<rootDir>/jest.setup.js"], // 添加设置文件
  testMatch: ["**/__tests__/**/*.test.ts"], // 指定测试文件的位置
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: true, // 启用覆盖率报告
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};
