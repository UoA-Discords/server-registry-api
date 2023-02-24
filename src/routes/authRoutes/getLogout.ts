import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';

export const getLogout: EndpointProvider<AuthScopes.TokenOnly, void, void> = {
    auth: AuthScopes.TokenOnly,
    permissionsRequired: null,
    applyToRoute({ auth, authService }) {
        return async (_req, res, next) => {
            try {
                await authService.logout(auth.access_token);

                res.sendStatus(200);
            } catch (error) {
                next(error);
            }
        };
    },
};
