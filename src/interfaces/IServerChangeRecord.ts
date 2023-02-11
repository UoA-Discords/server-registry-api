import { ServerStatusAction } from '../enums/ServerStatusAction';
import { DiscordIdString, ISOString } from '../types/utility';

/** Information about a change in status of a server. */
export interface IServerChangeRecord {
    verb: ServerStatusAction;
    by: DiscordIdString;
    at: ISOString;
    reason: string | null;
}
