import request from 'supertest';
import express from 'express';
import { mockedConfig } from './mockedConfig';
import { Config } from '../types/Config';
import { EndpointProviderReturnValue } from '../types/Express/EndpointProvider';
import { MiddlewareProvider } from '../types/Express/MiddlewareProvider';

/** Creates a stub Express app which responds with status code 200 for `GET /` */
export function stubApp(
    partialConfig?: Partial<Config>,
    preRouteMiddlewares?: MiddlewareProvider[],
    postRouteMiddlewares?: MiddlewareProvider[],
    route?: EndpointProviderReturnValue,
): request.SuperTest<request.Test> {
    const app = express();

    const config = { ...mockedConfig, ...partialConfig };

    if (preRouteMiddlewares) {
        for (const middleware of preRouteMiddlewares) {
            app.use(middleware(config));
        }
    }

    if (route) {
        app.get('/', route);
    } else {
        app.get('/', (_req, res) => res.sendStatus(200));
    }

    if (postRouteMiddlewares) {
        for (const middleware of postRouteMiddlewares) {
            app.use(middleware(config));
        }
    }

    return request(app);
}
