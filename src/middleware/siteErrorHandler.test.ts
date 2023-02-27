import express from 'express';
import request from 'supertest';
import { SiteError } from '../errors/SiteError';
import { mockedConfig } from '../tests/mockedConfig';
import { siteErrorHandler } from './siteErrorHandler';

jest.spyOn(global.console, 'log').mockImplementation(() => null);

describe('siteErrorHandler', () => {
    class MockedSiteError extends SiteError {
        public readonly statusCode = 401;

        public constructor() {
            super('', '', undefined);
        }
    }

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('catches SiteErrors', async () => {
        const app = express();

        app.get('/', () => {
            throw new MockedSiteError();
        });

        app.use(siteErrorHandler(mockedConfig));

        const res = await request(app).get('/').send();

        expect(res.statusCode).toBe(401);
    });

    it('skips other Errors', async () => {
        const app = express();

        app.get('/', () => {
            throw new Error();
        });

        app.use(siteErrorHandler(mockedConfig));

        const res = await request(app).get('/').send();

        expect(res.statusCode).toBe(500);
    });

    it('logs errors in when development mode', async () => {
        const app = express();

        app.set('env', 'development');

        app.get('/', () => {
            throw new MockedSiteError();
        });

        app.use(siteErrorHandler(mockedConfig));

        const res = await request(app).get('/').send();

        expect(res.statusCode).toBe(401);

        expect(console.log).toBeCalledTimes(1);
    });
});
