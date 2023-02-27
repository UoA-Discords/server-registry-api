import express from 'express';
import { HttpError } from 'express-openapi-validator/dist/framework/types';
import request from 'supertest';
import { mockedConfig } from '../tests/mockedConfig';
import { validatorErrorHandler } from './validatorErrorHandler';

describe('validatorErrorHandler', () => {
    it('catches HttpErrors', async () => {
        const app = express();

        app.get('/', () => {
            throw new HttpError({ name: '', path: '', status: 401 });
        });

        app.use(validatorErrorHandler(mockedConfig));

        const res = await request(app).get('/').send();

        expect(res.statusCode).toBe(400);
    });

    it('skips other Errors', async () => {
        const app = express();

        app.get('/', () => {
            throw new Error();
        });

        app.use(validatorErrorHandler(mockedConfig));

        const res = await request(app).get('/').send();

        expect(res.statusCode).toBe(500);
    });
});
