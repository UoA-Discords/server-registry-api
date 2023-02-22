import { AuthError } from '../../errors/AuthError';
import { UserModel } from '../../models/UserModel';
import { mockConfig } from '../../tests/mockConfig';
import { mockedOAuthResult } from '../../tests/mockedOAuthResult';
import { mockedAPIUser, mockedUser } from '../../tests/mockedUser';
import { LoginOrSignupResponse } from '../../types/Auth/LoginOrSignupResponse';
import { UserService } from '../UserService';
import { getAccessToken, getAssociatedUser, refreshAccessToken, revokeAccessToken } from './oAuthToken';
import { loginOrSignup, logout, refresh } from './sessions';
import { makeSiteToken } from './siteToken';

jest.mock('../UserService');
jest.mock('./oAuthToken');
jest.mock('./siteToken');

const mockedGetAccessToken = jest.mocked(getAccessToken);
const mockedGetAssociatedUser = jest.mocked(getAssociatedUser);
const mockedRefreshAccessToken = jest.mocked(refreshAccessToken);
const mockedRevokeAccessToken = jest.mocked(revokeAccessToken);
const mockedUserService = jest.mocked(UserService);
const mockedMakeSiteToken = jest.mocked(makeSiteToken);

const config = mockConfig();

beforeAll(() => {
    mockedGetAccessToken.mockResolvedValue(mockedOAuthResult);
    mockedGetAssociatedUser.mockResolvedValue(mockedAPIUser);
    mockedRefreshAccessToken.mockResolvedValue(mockedOAuthResult);
    mockedMakeSiteToken.mockReturnValue('fake site token');
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('loginOrSignup', () => {
    it('calls to register a new user if none existed previously', async () => {
        mockedUserService.getUserbyId.mockImplementationOnce(() => {
            throw new AuthError('', '');
        });

        const registerFn = jest.fn(() => Promise.resolve(mockedUser));

        mockedUserService.registerUser.mockImplementationOnce(registerFn);

        const res = await loginOrSignup(config, {} as UserModel, 'fake OAuth code', 'fake redirect URI', 'fake IP');

        expect(res).toMatchObject<LoginOrSignupResponse>({
            discordAuth: mockedOAuthResult,
            siteAuth: 'fake site token',
            user: mockedUser,
        });

        expect(registerFn).toBeCalledTimes(1);
    });

    it('calls to update an existing user if one existed previously', async () => {
        mockedUserService.getUserbyId.mockResolvedValueOnce(mockedUser);

        const updateFn = jest.fn(() => Promise.resolve(mockedUser));

        mockedUserService.updateUserDiscordData.mockImplementationOnce(updateFn);

        const res = await loginOrSignup(config, {} as UserModel, 'fake OAuth code', 'fake redirect URI', 'fake IP');

        expect(res).toMatchObject<LoginOrSignupResponse>({
            discordAuth: mockedOAuthResult,
            siteAuth: 'fake site token',
            user: mockedUser,
        });

        expect(updateFn).toBeCalledTimes(1);
    });
});

describe('refresh', () => {
    it('calls to update an existing user on success', async () => {
        const updateFn = jest.fn(() => Promise.resolve(mockedUser));

        mockedUserService.updateUserDiscordData.mockImplementationOnce(updateFn);

        const res = await refresh(config, {} as UserModel, 'fake refresh token', 'fake IP');

        expect(res).toMatchObject<LoginOrSignupResponse>({
            discordAuth: mockedOAuthResult,
            siteAuth: 'fake site token',
            user: mockedUser,
        });

        expect(updateFn).toBeCalledTimes(1);
    });
});

describe('logout', () => {
    it('calls to revoke an access token', async () => {
        const revokeFn = jest.fn();

        mockedRevokeAccessToken.mockImplementationOnce(revokeFn);

        await logout(config, 'fake access token');

        expect(revokeFn).toBeCalledTimes(1);
    });
});
