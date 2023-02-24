import { Response } from 'express';
import { NotFoundError } from './NotFoundError';

describe('NotFoundError', () => {
    it('sends status code 404', () => {
        const err = new NotFoundError('server');

        const status = jest.fn(() => ({ json: jest.fn() }));

        err.send({ status } as unknown as Response);

        expect(status).toBeCalledWith(404);
    });
});
