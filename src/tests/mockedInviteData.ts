import { InviteData } from '../types/Invite';

export const mockedInviteData: InviteData = {
    guild: {
        banner: 'mockedInviteData.guild.banner',
        description: 'mockedInviteData.guild.description',
        features: [],
        icon: 'mockedInviteData.guild.icon',
        id: 'mockedInviteData.guild.id',
        name: 'mockedInviteData.guild.name',
        nsfw_level: 0,
        splash: null,
        vanity_url_code: null,
        verification_level: 0,
        premium_subscription_count: 0,
    },
    code: 'mockedInviteData.code',
    channel: null,
    inviter: {
        id: 'mockedInviteData.inviter.id',
        username: 'mockedInviteData.inviter.username',
        discriminator: 'mockedInviteData.inviter.discriminator',
        avatar: 'mockedInviteData.inviter.avatar',
    },
};
