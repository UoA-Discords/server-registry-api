import { AuthService } from '../../services/AuthService';
import { LoginOrSignupResponse } from '../../types/Auth/LoginOrSignupResponse';
import { AuthScopes, DatabaseScopes, EndpointProvider } from '../../types/Express/EndpointProvider';

export interface PostLoginRequest {
    code: string;
    redirect_uri: string;
}

export const postLogin: EndpointProvider<
    AuthScopes.None,
    DatabaseScopes.Access,
    PostLoginRequest,
    LoginOrSignupResponse
> = {
    auth: AuthScopes.None,
    database: DatabaseScopes.Access,
    permissionsRequired: null,
    applyToRoute({ config, db }) {
        return async (req, res, next) => {
            try {
                const { code, redirect_uri } = req.body;

                const loginResponse = await AuthService.loginOrSignup(config, db.users, code, redirect_uri, req.ip);

                res.status(200).json(loginResponse);
            } catch (error) {
                next(error);
            }
        };
    },
};
