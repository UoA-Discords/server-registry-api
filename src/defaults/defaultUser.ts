import { ServerStatus } from '../types/Server/ServerStatus';
import { ServerStatusAction } from '../types/Server/ServerStatusAction';
import { User } from '../types/User';
import { UserPermissions } from '../types/User/UserPermissions';

export const defaultUser: Pick<
    User<true>,
    'permissions' | 'favouriteServer' | 'submissions' | 'actions' | 'permissionsLog'
> = {
    permissions: UserPermissions.Favourite | UserPermissions.MakeApplications,
    favouriteServer: null,
    submissions: {
        [ServerStatus.Featured]: 0,
        [ServerStatus.Pending]: 0,
        [ServerStatus.Public]: 0,
        [ServerStatus.Rejected]: 0,
        [ServerStatus.Withdrawn]: 0,
    },
    actions: {
        [ServerStatusAction.Accept]: 0,
        [ServerStatusAction.Delete]: 0,
        [ServerStatusAction.Feature]: 0,
        [ServerStatusAction.Reconsider]: 0,
        [ServerStatusAction.Reinstate]: 0,
        [ServerStatusAction.Reject]: 0,
        [ServerStatusAction.Unfeature]: 0,
        [ServerStatusAction.Withdraw]: 0,
    },
    permissionsLog: [],
};
