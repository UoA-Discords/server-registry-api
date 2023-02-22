import { defaultConfig } from '../defaults/defaultConfig';
import { Config, ImportedConfig } from '../types/Config';

/**
 * Imports and transforms values from `config.json`, using the {@link defaultConfig default config} values as a
 * fallback for any missing non-required values.
 *
 * @throws Throws an error if required values (`mongoURI`, `discordClientSecret`, `discordClientId`) are missing.
 */
export function loadConfig(): Config {
    /** Config that we will take values from when forming the final globally-used {@link Config} object. */
    // we use `readFileSync` since it is easier to mock than `require()`
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const partialConfig: ImportedConfig = require('../../config.json');

    if (partialConfig.jwtSecret === undefined) {
        console.warn('Warning: No jwtSecret defined in config, sessions will not persist between resets!');
    }

    if (partialConfig.mongoURI === undefined) {
        throw new Error('No mongoURI defined in config!');
    }

    if (partialConfig.discordClientSecret === undefined) {
        throw new Error('No discordClientSecret defined in config!');
    }

    if (partialConfig.discordClientId === undefined) {
        throw new Error('No discordClientId defined in config!');
    }

    return {
        ...defaultConfig,
        ...partialConfig,
        clientUrls: partialConfig.clientUrls ? new Set(partialConfig.clientUrls) : defaultConfig.clientUrls,
        rateLimitBypassTokens: partialConfig.rateLimitBypassTokens
            ? new Set(partialConfig.rateLimitBypassTokens)
            : defaultConfig.rateLimitBypassTokens,
        version: defaultConfig.version,
        startedAt: defaultConfig.startedAt,
    };
}
