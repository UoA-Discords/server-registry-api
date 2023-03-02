import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { ISOString } from '../../types/Utility';

interface PostRootResponse {
    startTime: ISOString;
    version: string;
    receivedRequest: ISOString;
    numUsers: number;
    numServers: number;
}

export const postRoot: EndpointProvider<AuthScopes.None, void, PostRootResponse> = {
    auth: AuthScopes.None,
    permissionsRequired: null,
    applyToRoute({ config, serverService, userService }) {
        const { startedAt: startTime, version } = config;
        return async (_req, res, next) => {
            try {
                const [numServers, numUsers] = await Promise.all([
                    serverService.getNumPublicServers(),
                    userService.getNumUsers(),
                ]);
                res.status(200).json({
                    startTime,
                    version,
                    receivedRequest: new Date().toISOString(),
                    numServers,
                    numUsers,
                });
            } catch (error) {
                next(error);
            }
        };
    },
};
