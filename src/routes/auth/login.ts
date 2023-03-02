import { LoginOrSignupResponse } from '../../types/Auth/LoginOrSignupResponse';
import { EndpointProvider, AuthScopes } from '../../types/Express/EndpointProvider';

interface PostLoginRequest {
    code: string;
    redirect_uri: string;
}

export const login: EndpointProvider<AuthScopes.None, PostLoginRequest, LoginOrSignupResponse> = {
    auth: AuthScopes.None,
    permissionsRequired: null,
    applyToRoute({ authService }) {
        return async (req, res, next) => {
            try {
                const { code, redirect_uri } = req.body;

                const loginResponse = await authService.loginOrSignup(code, redirect_uri, req.ip);

                res.status(200).json(loginResponse);
            } catch (error) {
                next(error);
            }
        };
    },
};
