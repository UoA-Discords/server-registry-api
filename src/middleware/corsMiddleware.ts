import cors from 'cors';
import { CorsError } from '../errors/CorsError';
import { Config } from '../types/Config';
import { MiddlewareProvider } from '../types/Express/MiddlewareProvider';

export const corsMiddleware: MiddlewareProvider = ({ clientUrls }: Config) => {
    return cors({
        origin: clientUrls.has('*')
            ? '*'
            : (origin, callback) => {
                  // origin is undefined on non-browser requests (e.g. Insomnia)
                  if (origin === undefined || clientUrls.has(origin)) callback(null, true);
                  else callback(new CorsError());
              },
        exposedHeaders: [
            'RateLimit-Limit',
            'RateLimit-Remaining',
            'RateLimit-Reset',
            'Retry-After',
            'RateLimit-Bypass-Response',
        ],
    });
};
