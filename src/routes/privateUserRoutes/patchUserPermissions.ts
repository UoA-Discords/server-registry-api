import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';
import { DiscordIdString } from '../../types/Utility';

interface PatchUserPermissionsRequest {
    newPermissions: UserPermissions;
    reason: string | null;
}

export const patchUserPermissions: EndpointProvider<
    AuthScopes.User,
    PatchUserPermissionsRequest,
    User<true>,
    { id: DiscordIdString }
> = {
    auth: AuthScopes.User,
    permissionsRequired: UserPermissions.ManageUsers,
    applyToRoute({ user, userService }) {
        return async (req, res, next) => {
            try {
                const { id } = req.params;
                const { newPermissions, reason } = req.body;

                const updatedUser = await userService.updateUserPermissions(user, id, newPermissions, reason);

                res.status(200).json(updatedUser);
            } catch (error) {
                next(error);
            }
        };
    },
};
