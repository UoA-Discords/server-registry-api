import { LoginOrSignupResponse } from '../../types/Auth/LoginOrSignupResponse';
import { EndpointProvider, AuthScopes } from '../../types/Express/EndpointProvider';

export const getRefresh: EndpointProvider<AuthScopes.TokenOnly, void, LoginOrSignupResponse> = {
    auth: AuthScopes.TokenOnly,
    permissionsRequired: null,
    applyToRoute({ auth, authService }) {
        return async (req, res, next) => {
            try {
                const refreshResponse = await authService.refresh(auth.refresh_token, req.ip);

                res.status(200).json(refreshResponse);
            } catch (error) {
                next(error);
            }
        };
    },
};
