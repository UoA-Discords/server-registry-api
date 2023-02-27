import { ErrorRequestHandler, RequestHandler } from 'express';
import { Config } from '../Config';

export type MiddlewareProvider = (
    config: Config,
) => RequestHandler | ErrorRequestHandler | RequestHandler[] | ErrorRequestHandler[];
