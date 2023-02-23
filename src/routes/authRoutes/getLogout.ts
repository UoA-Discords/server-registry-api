import { AuthService } from '../../services/AuthService';
import { AuthScopes, DatabaseScopes, EndpointProvider } from '../../types/Express/EndpointProvider';

export const getLogout: EndpointProvider<AuthScopes.TokenOnly, DatabaseScopes.Access, void, void> = {
    auth: AuthScopes.TokenOnly,
    database: DatabaseScopes.Access,
    permissionsRequired: null,
    applyToRoute({ auth, config }) {
        return async (_req, res, next) => {
            try {
                await AuthService.logout(config, auth.access_token);
                res.sendStatus(200);
            } catch (error) {
                next(error);
            }
        };
    },
};
