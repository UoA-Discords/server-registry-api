import { UserChangeRecord } from '../types/User/UserChangeRecord';

export const mockedUserChangeRecord: UserChangeRecord = {
    oldUserPermissions: 0,
    by: 'mockedUserChangeRecord.by',
    at: new Date().toISOString(),
    reason: null,
};
