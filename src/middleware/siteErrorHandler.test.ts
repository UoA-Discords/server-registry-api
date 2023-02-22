import express, { Response } from 'express';
import request from 'supertest';
import { CorsError } from '../errors/CorsError';
import { SiteError } from '../errors/SiteError';
import { mockConfig } from '../tests/mockConfig';

import { siteErrorHandler } from './siteErrorHandler';

describe('siteErrorHandler', () => {
    class MockedSiteError extends SiteError {
        public send(res: Response): void {
            res.sendStatus(401);
        }
    }

    it('catches SiteErrors', async () => {
        const app = express();

        app.get('/', () => {
            throw new MockedSiteError();
        });

        app.use(siteErrorHandler(mockConfig()));

        const res = await request(app).get('/').send();

        expect(res.statusCode).toBe(401);
    });

    it('catches CorsErrors', async () => {
        const app = express();

        app.get('/', () => {
            throw new CorsError();
        });

        app.use(siteErrorHandler(mockConfig()));

        const res = await request(app).get('/').send();

        expect(res.statusCode).toBe(400);
    });

    it('skips other Errors', async () => {
        const app = express();

        app.get('/', () => {
            throw new Error();
        });

        app.use(siteErrorHandler(mockConfig()));

        const res = await request(app).get('/').send();

        expect(res.statusCode).toBe(500);
    });
});
