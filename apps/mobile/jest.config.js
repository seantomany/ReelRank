module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/__tests__'],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|@react-native|react-native|expo|@expo|@reelrank)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@reelrank/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
};
