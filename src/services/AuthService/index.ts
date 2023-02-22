import * as sessions from './sessions';
import * as siteToken from './siteToken';

export const AuthService = {
    ...sessions,
    ...siteToken,
};
