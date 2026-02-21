/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
    // uuid@13 is pure ESM — transform it through ts-jest with allowJs
    '^.+\\.js$': ['ts-jest', {
      tsconfig: { allowJs: true, esModuleInterop: true },
      diagnostics: false,
    }],
  },
  // Don't ignore uuid so the transform above can process its ESM files
  transformIgnorePatterns: ['/node_modules/(?!(uuid)/)'],
  collectCoverageFrom: [
    'src/application/use-cases/**/*.ts',
  ],
  coverageReporters: ['text', 'cobertura'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 80,
      lines: 75,
      statements: 75,
    },
  },
};
