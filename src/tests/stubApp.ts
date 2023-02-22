import request from 'supertest';
import express from 'express';
import { MiddlewareProvider } from '../types/Express/MiddlewareProvider';
import { Config } from '../types/Config';
import { mockConfig } from './mockConfig';

/** Creates a stub Express app which responds with status code 200 for `GET /` */
export function stubApp(
    config?: Config,
    preRouteMiddlewares?: MiddlewareProvider[],
    postRouteMiddlewares?: MiddlewareProvider[],
): request.SuperTest<request.Test> {
    const app = express();

    config ??= mockConfig();

    if (preRouteMiddlewares) {
        for (const middleware of preRouteMiddlewares) {
            app.use(middleware(config));
        }
    }

    app.get('/', (_req, res) => res.sendStatus(200));

    if (postRouteMiddlewares) {
        for (const middleware of postRouteMiddlewares) {
            app.use(middleware(config));
        }
    }

    return request(app);
}
