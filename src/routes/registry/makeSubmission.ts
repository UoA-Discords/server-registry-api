import { ForbiddenError } from '../../errors/ForbiddenError';
import { PermissionService } from '../../services/PermissionService';
import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { Server } from '../../types/Server';
import { ServerStatus } from '../../types/Server/ServerStatus';
import { ServerTags } from '../../types/Server/ServerTags';
import { UserPermissions } from '../../types/User/UserPermissions';

interface MakeSubmissionRequest {
    inviteCode: string;
    tags: ServerTags;
}

export const makeSubmission: EndpointProvider<AuthScopes.User, MakeSubmissionRequest, Server> = {
    auth: AuthScopes.User,
    permissionsRequired: UserPermissions.MakeApplications,
    applyToRoute({ user, serverService }) {
        return async (req, res, next) => {
            try {
                const { inviteCode, tags } = req.body;

                const numPending = user.submissions[ServerStatus.Pending];

                if (numPending > 0) {
                    if (!PermissionService.hasPermissions(user.permissions, UserPermissions.MakeLotsOfApplications)) {
                        throw new ForbiddenError(
                            `You already have ${numPending} pending application${
                                numPending !== 1 ? 's' : ''
                            }, please wait for it to be reviewed before submitting another.`,
                        );
                    }

                    if (
                        numPending >= 10 &&
                        !PermissionService.hasPermissions(user.permissions, UserPermissions.ManageServers)
                    ) {
                        throw new ForbiddenError(
                            `You already have ${numPending} pending applications, please wait for one to be reviewed before submitting another.`,
                        );
                    }
                }

                const guild = await serverService.validateInviteCode(inviteCode);

                const server = await serverService.createNewServer(user, guild, tags);

                res.status(200).json(server);
            } catch (error) {
                next(error);
            }
        };
    },
};
