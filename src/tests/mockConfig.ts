import { defaultConfig } from '../defaults/defaultConfig';
import { Config } from '../types/Config';

export function mockConfig(partialConfig?: Partial<Config>) {
    return { ...defaultConfig, ...partialConfig };
}
