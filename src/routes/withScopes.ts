import { Request } from 'express';
import { AuthError } from '../errors/AuthError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { AuthService } from '../services';
import { hasPermission } from '../services/User/UserService';
import { SiteTokenPayload } from '../types/Auth/SiteTokenPayload';
import { Config } from '../types/Config';
import { AppModels } from '../types/Database/AppModels';
import {
    EndpointProvider,
    AuthScopes,
    DatabaseScopes,
    EndpointProviderReturnValue,
} from '../types/Express/EndpointProvider';

export function withOptionalAuth(
    config: Config,
    req: Request<unknown, unknown, unknown, unknown>,
): SiteTokenPayload | null {
    const authHeader = req.get('Authorization');
    if (authHeader === undefined) return null;
    return AuthService.validateSiteToken(config, req.get('Authorization'));
}

/** Wrapper for endpoint handlers to ensure they get all their required parameters. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withScopes<T extends EndpointProvider<AuthScopes, DatabaseScopes, any, any, any, any>>(
    provider: T,
    config: Config,
    models?: AppModels,
): EndpointProviderReturnValue {
    let db: AppModels | null;

    switch (provider.database) {
        case DatabaseScopes.None:
            db = null;
            break;
        case DatabaseScopes.Access:
            if (models === undefined) return (_req, res) => res.sendStatus(501);
            db = models;
            break;
        default:
            throw new Error(`Unrecognized database scope: ${provider.database}`);
    }

    switch (provider.auth) {
        case AuthScopes.None:
            return (req, res, next) => provider.applyToRoute({ config, auth: null, user: null, db })(req, res, next);
        case AuthScopes.TokenOnly:
            return (req, res, next) => {
                const auth = AuthService.validateSiteToken(config, req.get('Authorization'));
                provider.applyToRoute({ config, auth, user: null, db })(req, res, next);
            };
        case AuthScopes.OptionalUser:
            if (models === undefined) return (_req, res) => res.sendStatus(501);
            return async (req, res, next) => {
                try {
                    const auth = withOptionalAuth(config, req);
                    if (auth === null) return provider.applyToRoute({ config, auth, user: null, db })(req, res, next);
                    const user = await models.users.findOne({ _id: auth.id });
                    if (user === null)
                        throw new AuthError('Account Not Found', 'Your account was most likely deleted.');
                    return provider.applyToRoute({ config, auth, user, db })(req, res, next);
                } catch (error) {
                    return next(error);
                }
            };
        case AuthScopes.User:
            if (models === undefined) return (_req, res) => res.sendStatus(501);
            return async (req, res, next) => {
                try {
                    const auth = AuthService.validateSiteToken(config, req.get('Authorization'));
                    const user = await models.users.findOne({ _id: auth.id });
                    if (user === null)
                        throw new AuthError('Account Not Found', 'Your account was most likely deleted.');
                    if (!!provider.permissionsRequired && !hasPermission(user, provider.permissionsRequired)) {
                        throw new ForbiddenError(provider.permissionsRequired, user.permissions);
                    }
                    return provider.applyToRoute({ config, auth, user, db })(req, res, next);
                } catch (error) {
                    return next(error);
                }
            };
        default:
            throw new Error(`Unrecognized auth scope ${provider.auth}`);
    }
}
