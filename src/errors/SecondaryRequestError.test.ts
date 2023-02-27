import axios from 'axios';
import { SecondaryRequestError } from './SecondaryRequestError';

jest.mock('axios');

const mockedAxios = jest.mocked(axios);

describe('SecondaryRequestError', () => {
    mockedAxios.isAxiosError.mockReturnValue(true);

    it('chooses the best status code', () => {
        const fullError = { response: { status: 123 } };

        const partialError = { status: 456 };

        expect(new SecondaryRequestError('', '', fullError).additionalData).toBe(123);

        expect(new SecondaryRequestError('', '', partialError).additionalData).toBe(456);

        expect(new SecondaryRequestError('', '', {}).additionalData).toBe(null);
    });
});
