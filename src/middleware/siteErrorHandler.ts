import { CorsError } from '../errors/CorsError';
import { SiteError } from '../errors/SiteError';
import { MiddlewareProvider } from '../types/Express/MiddlewareProvider';

export const siteErrorHandler: MiddlewareProvider = () => {
    return (err, _req, res, next) => {
        if (err instanceof SiteError || err instanceof CorsError) err.send(res);
        else next(err);
    };
};
