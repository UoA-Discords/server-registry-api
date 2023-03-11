import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { ISOString } from '../../types/Utility';

interface PostRootResponse {
    startTime: ISOString;
    version: string;
    receivedRequest: ISOString;
    numUsers: number;
    numServers: number;
    numPendingServers: number;
}

export const postRoot: EndpointProvider<AuthScopes.None, void, PostRootResponse> = {
    auth: AuthScopes.None,
    permissionsRequired: null,
    applyToRoute({ config, serverService, userService }) {
        const { startedAt: startTime, version } = config;
        return async (_req, res, next) => {
            try {
                const [numServers, numUsers, numPendingServers] = await Promise.all([
                    serverService.getNumPublicServers(),
                    userService.getNumUsers(),
                    serverService.getNumPendingServers(),
                ]);
                res.status(200).json({
                    startTime,
                    version,
                    receivedRequest: new Date().toISOString(),
                    numServers,
                    numUsers,
                    numPendingServers,
                });
            } catch (error) {
                next(error);
            }
        };
    },
};
