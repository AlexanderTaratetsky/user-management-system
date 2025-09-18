export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1.js'
  }
};
