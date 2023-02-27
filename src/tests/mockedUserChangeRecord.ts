import { UserChangeRecord } from '../types/User/UserChangeRecord';
import { UserPermissions } from '../types/User/UserPermissions';

export const mockedUserChangeRecord: UserChangeRecord = {
    oldUserPermissions: UserPermissions.None,
    by: 'mockedUserChangeRecord.by',
    at: new Date().toISOString(),
    reason: null,
};
