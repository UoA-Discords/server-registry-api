import { PermissionService } from '../../services/PermissionService';
import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';
import { DiscordIdString } from '../../types/Utility';

export const getUserById: EndpointProvider<
    AuthScopes.OptionalUser,
    void,
    User<'HideIP' | 'ShowIP'>,
    { id: DiscordIdString }
> = {
    auth: AuthScopes.OptionalUser,
    permissionsRequired: null,
    applyToRoute({ user, userService }) {
        return async (req, res, next) => {
            try {
                const { id } = req.params;

                const foundUser = await userService.getUserById(id);

                res.status(200).json(
                    user !== null && PermissionService.hasPermissions(user.permissions, UserPermissions.Owner)
                        ? foundUser
                        : { ...foundUser, metaData: { ...foundUser.metaData, latestIp: null } },
                );
            } catch (error) {
                next(error);
            }
        };
    },
};
