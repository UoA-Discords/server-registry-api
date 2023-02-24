import { Response } from 'express';
import { InternalServiceError } from './InternalServiceError';

describe('InternalServiceError', () => {
    it('sends status code 500', () => {
        const err = new InternalServiceError('');

        const sendStatus = jest.fn();

        err.send({ sendStatus } as unknown as Response);

        expect(sendStatus).toBeCalledWith(500);
    });
});
