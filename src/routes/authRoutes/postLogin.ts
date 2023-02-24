import { LoginOrSignupResponse } from '../../types/Auth/LoginOrSignupResponse';
import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';

export interface PostLoginRequest {
    code: string;
    redirect_uri: string;
}

export const postLogin: EndpointProvider<AuthScopes.None, PostLoginRequest, LoginOrSignupResponse> = {
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
