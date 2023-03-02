import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { Server } from '../../types/Server';
import { ServerStatus } from '../../types/Server/ServerStatus';
import { UserPermissions } from '../../types/User/UserPermissions';
import { DiscordIdString } from '../../types/Utility';

interface ChangeServerStatusRequest {
    newStatus: ServerStatus;
    reason: string | null;
}

export const changeServerStatus: EndpointProvider<
    AuthScopes.User,
    ChangeServerStatusRequest,
    Server,
    { id: DiscordIdString }
> = {
    auth: AuthScopes.User,
    permissionsRequired: UserPermissions.ManageServers,
    applyToRoute({ user, serverService }) {
        return async (req, res, next) => {
            try {
                const { id } = req.params;
                const { newStatus, reason } = req.body;

                const updatedServer = await serverService.changeServerStatus(user, id, newStatus, reason);

                res.status(200).json(updatedServer);
            } catch (error) {
                next(error);
            }
        };
    },
};
