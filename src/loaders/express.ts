import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { join } from 'path';
import apiSpec from '../openapi.json';
import { Config } from '../types/Config';
import { corsMiddleware } from '../middleware/corsMiddleware';
import { rateLimitingMiddleware } from '../middleware/rateLimitingMiddleware';
import { validatorMiddleware } from '../middleware/validatorMiddleware';
import { validatorErrorHandler } from '../middleware/validatorErrorHandler';
import { siteErrorHandler } from '../middleware/siteErrorHandler';
import { AppModels } from '../types/Database/AppModels';
import { applyMiscellaneousRoutes } from '../routes/miscellaneousRoutes';

export function loadExpress(config: Config, models: AppModels): Express {
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

    // pre-route middleware (e.g. validation, authentication)
    app.use(express.json());
    app.use(corsMiddleware(config));
    app.use(rateLimitingMiddleware(config));
    app.use(validatorMiddleware(config));
    app.use(validatorErrorHandler(config));

    applyMiscellaneousRoutes(app, config, models);

    // post-route middleware (e.g. error catching)
    app.use(siteErrorHandler(config));

    return app;
}
