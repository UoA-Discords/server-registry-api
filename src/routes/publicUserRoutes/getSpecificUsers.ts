import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { User } from '../../types/User';
import { DiscordIdString } from '../../types/Utility';

interface GetSpecificUsersRequest {
    userIds: DiscordIdString[];
}

export const getSpecificUsers: EndpointProvider<AuthScopes.OptionalUser, GetSpecificUsersRequest, User<boolean>[]> = {
    auth: AuthScopes.OptionalUser,
    permissionsRequired: null,
    applyToRoute({ userService }) {
        return async (req, res, next) => {
            try {
                const { userIds } = req.body;

                const users = await userService.getSpecificUsers(userIds);

                res.status(200).json(users);
            } catch (error) {
                next(error);
            }
        };
    },
};
