import axios from 'axios';
import { Response } from 'express';
import { SecondaryRequestError } from './SecondaryRequestError';

jest.mock('axios');

const mockedAxios = jest.mocked(axios);

describe('SecondaryRequestError', () => {
    mockedAxios.isAxiosError.mockReturnValueOnce(true).mockReturnValueOnce(true);

    it('chooses the best status code', () => {
        const fullError = { response: { status: 123 } };

        const partialError = { status: 456 };

        expect(new SecondaryRequestError('', '', fullError).receivedStatusCode).toBe(123);

        expect(new SecondaryRequestError('', '', partialError).receivedStatusCode).toBe(456);

        expect(new SecondaryRequestError('', '', {}).receivedStatusCode).toBe(undefined);
    });

    it("replaces undefined status codes with 'Unknown'", () => {
        const sendFn = jest.fn();
        const res = { status: () => ({ send: sendFn }) } as unknown as Response;

        new SecondaryRequestError('', '', {}).send(res);

        expect(sendFn).toBeCalledWith({
            message: '',
            hint: '',
            receivedStatusCode: 'Unknown',
        });
    });
});
