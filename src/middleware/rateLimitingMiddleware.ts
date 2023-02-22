import rateLimit from 'express-rate-limit';
import { Config } from '../types/Config';
import { MiddlewareProvider } from '../types/Express/MiddlewareProvider';

export const rateLimitingMiddleware: MiddlewareProvider = (config: Config) => {
    const { maxRequestsPerMinute, rateLimitBypassTokens } = config;

    return rateLimit({
        windowMs: 60 * 1000,
        max: maxRequestsPerMinute,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req, res) => {
            const token = req.get('RateLimit-Bypass-Token');
            if (token === undefined) return false;

            if (!rateLimitBypassTokens.has(token)) {
                res.setHeader('RateLimit-Bypass-Response', 'Invalid');
                return false;
            }

            res.setHeader('RateLimit-Bypass-Response', 'Valid');
            return true;
        },
    });
};