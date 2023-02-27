import express, { Express } from 'express';
import { join } from 'path';
import swaggerUi from 'swagger-ui-express';
import {
    corsMiddleware,
    rateLimitingMiddleware,
    siteErrorHandler,
    validatorErrorHandler,
    validatorMiddleware,
} from '../middleware';
import apiSpec from '../openapi.json';
import { applyRoutes } from '../routes';
import { Config } from '../types/Config';
import { AppServices } from '../types/Services';

export function loadExpress(config: Config, services: AppServices): Express {
    const app = express();

    app.set('trust proxy', config.numProxies);

    app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(apiSpec, { customSiteTitle: 'UoA Discords Server Registry' }),
    );

    app.use('/spec', express.static(join(__dirname, '../', 'openapi.json')));

    app.use('/static', express.static('static', { extensions: ['html'] }));

    app.use('/favicon.ico', express.static('static/favicon.ico'));

    {
        // pre-route middleware (e.g. validation, authentication)
        app.use(express.json());
        app.use(corsMiddleware(config));
        app.use(rateLimitingMiddleware(config));
        app.use(validatorMiddleware(config));
        // this error handler is pre-route since validator errors are thrown by the validator middleware,
        // meaning we can catch them before the route is called
        app.use(validatorErrorHandler(config));
    }

    applyRoutes(app, config, services);

    {
        // post-route middleware (e.g. error catching).
        app.use(siteErrorHandler(config));
    }

    return app;
}
