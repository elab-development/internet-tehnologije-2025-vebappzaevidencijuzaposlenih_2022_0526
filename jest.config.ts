import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // da Jest razume TS i TSX
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },

  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
};

export default config;