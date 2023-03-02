import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { Server } from '../../types/Server';
import { ServerTags } from '../../types/Server/ServerTags';
import { UserPermissions } from '../../types/User/UserPermissions';
import { DiscordIdString } from '../../types/Utility';

interface ChangeServerTagsRequest {
    newTags: ServerTags;
}

export const changeServerTags: EndpointProvider<
    AuthScopes.User,
    ChangeServerTagsRequest,
    Server,
    { id: DiscordIdString }
> = {
    auth: AuthScopes.User,
    permissionsRequired: UserPermissions.ManageServers,
    applyToRoute({ serverService }) {
        return async (req, res, next) => {
            try {
                const { id } = req.params;
                const { newTags } = req.body;

                const updatedServer = await serverService.changeServerTags(id, newTags);

                res.status(200).json(updatedServer);
            } catch (error) {
                next(error);
            }
        };
    },
};
