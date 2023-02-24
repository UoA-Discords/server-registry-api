import { Response } from 'express';
import { InternalServiceError } from './InternalServiceError';

// for some reason Jest is deciding that line 15 of InternalServiceError is uncovered, despite it being a lot simpler
// than other error classes

describe('InternalServiceError', () => {
    it('sends status code 500', () => {
        const err = new InternalServiceError('');

        const sendStatus = jest.fn();

        err.send({ sendStatus } as unknown as Response);

        expect(sendStatus).toBeCalledWith(500);
    });
});
