import { Request } from 'express';
import { ForbiddenError } from '../errors/ForbiddenError';
import { AuthService } from '../services/AuthService';
import { UserService } from '../services/UserService';
import { SiteTokenPayload } from '../types/Auth/SiteTokenPayload';
import { Config } from '../types/Config';
import { EndpointProvider, AuthScopes, EndpointProviderReturnValue } from '../types/Express/EndpointProvider';
import { AppServices } from '../types/Services/AppServices';

export function withOptionalAuth(
    authService: AuthService,
    req: Request<unknown, unknown, unknown, unknown>,
): SiteTokenPayload | null {
    const authHeader = req.get('Authorization');
    if (authHeader === undefined) return null;
    return authService.validateSiteToken(req.get('Authorization'));
}

/** Wrapper for endpoint handlers to ensure they get all their required parameters. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withScopes<T extends EndpointProvider<AuthScopes, any, any, any, any>>(
    provider: T,
    config: Config,
    services: AppServices,
): EndpointProviderReturnValue {
    const { authService, userService } = services;

    const params = { config, ...services };

    switch (provider.auth) {
        case AuthScopes.None:
            return (req, res, next) => provider.applyToRoute({ ...params, auth: null, user: null })(req, res, next);
        case AuthScopes.TokenOnly:
            return (req, res, next) => {
                const auth = authService.validateSiteToken(req.get('Authorization'));
                provider.applyToRoute({ ...params, auth, user: null })(req, res, next);
            };
        case AuthScopes.OptionalUser:
            return async (req, res, next) => {
                try {
                    const auth = withOptionalAuth(authService, req);
                    if (auth === null) return provider.applyToRoute({ ...params, auth, user: null })(req, res, next);
                    const user = await userService.getUserById(auth.id, true);
                    return provider.applyToRoute({ ...params, auth, user })(req, res, next);
                } catch (error) {
                    return next(error);
                }
            };
        case AuthScopes.User:
            return async (req, res, next) => {
                try {
                    const auth = authService.validateSiteToken(req.get('Authorization'));
                    const user = await userService.getUserById(auth.id, true);
                    if (
                        provider.permissionsRequired !== null &&
                        !UserService.hasPermission(user, provider.permissionsRequired)
                    ) {
                        throw new ForbiddenError(provider.permissionsRequired);
                    }
                    return provider.applyToRoute({ ...params, auth, user })(req, res, next);
                } catch (error) {
                    return next(error);
                }
            };
        default:
            throw new Error(`Unrecognized auth scope ${provider.auth}`);
    }
}
