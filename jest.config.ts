import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/src/tests/'],
    fakeTimers: {
        enableGlobally: true,
        // MongoDB memory server breaks when using fake timers (nextTick)
        // see https://github.com/nock/nock/issues/2200#issuecomment-1280957462
        // Supertest also beaks when using fake timers (setImmediate)
        doNotFake: ['nextTick', 'setImmediate'],
    },
    maxWorkers: 4,
};

export default config;
