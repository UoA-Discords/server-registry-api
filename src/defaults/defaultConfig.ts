import { randomBytes } from 'crypto';
import { Config } from '../types/Config';

/** Default config values, keep this in sync with `.github/config-schema.json`. */
export const defaultConfig: Config = {
    port: 5000,

    clientUrls: new Set(['*']),

    numProxies: 0,

    maxRequestsPerMinute: 30,

    rateLimitBypassTokens: new Set(),

    /** This default is undocumented in the schema, as it should only be used in testing. */
    mongoURI: 'dummy mongo URI',

    mongoDbName: 'uoa_discords_server_registry_api_default',

    /**
     * This ensures cryptographic security, but also means it will change every time the server restarts, meaning user
     * sessions will not persist between server restarts either.
     *
     * This default is undocumented in the schema as it cannot be faithfully represented.
     */
    jwtSecret: randomBytes(8).toString('hex'),

    /** This default is undocumented in the schema, as it should only be used in testing. */
    discordClientId: 'dummy Discord client ID',

    /** This default is undocumented in the schema, as it should only be used in testing. */
    discordClientSecret: 'dummy Discord client secret',

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    version: process.env.NPM_VERSION || require('../../package.json').version,

    startedAt: new Date().toISOString(),
};
