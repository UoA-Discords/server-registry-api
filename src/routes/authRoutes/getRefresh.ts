import { AuthService } from '../../services/AuthService';
import { LoginOrSignupResponse } from '../../types/Auth/LoginOrSignupResponse';
import { AuthScopes, DatabaseScopes, EndpointProvider } from '../../types/Express/EndpointProvider';

export const getRefresh: EndpointProvider<AuthScopes.TokenOnly, DatabaseScopes.Access, void, LoginOrSignupResponse> = {
    auth: AuthScopes.TokenOnly,
    database: DatabaseScopes.Access,
    permissionsRequired: null,
    applyToRoute({ auth, config, db }) {
        return async (req, res, next) => {
            try {
                const refreshResponse = await AuthService.refresh(config, db.users, auth.refresh_token, req.ip);

                res.status(200).json(refreshResponse);
            } catch (error) {
                next(error);
            }
        };
    },
};
