import { APIInvite, APIInviteGuild, APIUser } from 'discord-api-types/v10';

export interface InviteData extends APIInvite {
    guild: APIInviteGuild;
    inviter: APIUser;
}
