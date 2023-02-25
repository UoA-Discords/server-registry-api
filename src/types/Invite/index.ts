import { APIInvite, APIInviteGuild } from 'discord-api-types/v10';

export interface InviteData extends APIInvite {
    guild: APIInviteGuild;
}
