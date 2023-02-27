import { mockedConfig } from '../tests/mockedConfig';
import { Config } from '../types/Config';
import { loadMongo } from './mongo';

describe('loadMongo', () => {
    it('throws an error when the DB name is too long', async () => {
        const config: Config = {
            ...mockedConfig,
            mongoDbName: 'a'.repeat(39),
        };

        try {
            await loadMongo(config);
            fail('should have thrown an error');
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        }
    });
});
