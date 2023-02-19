import { UserPermissions } from '../enums/UserPermissions';
import { DiscordIdString, ISOString } from '../types/utility';

/** Information about a change in permissions of a user. */
export interface UserChangeRecord {
    oldUserPermissions: UserPermissions;
    by: DiscordIdString;
    at: ISOString;
    reason: string | null;
}
