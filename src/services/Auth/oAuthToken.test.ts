import axios from 'axios';
import { SecondaryRequestError } from '../../errors/SecondaryRequestError';
import { mockConfig } from '../../tests/mockConfig';
import { getAccessToken, getAssociatedUser, refreshAccessToken, revokeAccessToken } from './oAuthToken';

jest.mock('axios');

const mockedAxios = jest.mocked(axios);

const config = mockConfig();

afterEach(() => {
    jest.resetAllMocks();
});

describe('getAccessToken', () => {
    it('makes a request to the Discord OAuth endpoint', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: 'test response' });
        const res = await getAccessToken(config, 'test auth code', 'test redirect uri');

        expect(res).toBe('test response');

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('throws a SecondaryRequestError when the request fails', async () => {
        mockedAxios.post.mockImplementationOnce(() => {
            throw new Error();
        });

        try {
            await getAccessToken(config, 'test auth code', 'test redirect uri');
            fail('should have thrown an error');
        } catch (error) {
            expect(error).toBeInstanceOf(SecondaryRequestError);
        }
    });
});

describe('refreshAccessToken', () => {
    it('makes a request to the Discord OAuth endpoint', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: 'test response' });
        const res = await refreshAccessToken(config, 'test refresh token');

        expect(res).toBe('test response');

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('throws a SecondaryRequestError when the request fails', async () => {
        mockedAxios.post.mockImplementationOnce(() => {
            throw new Error();
        });

        try {
            await refreshAccessToken(config, 'test refresh token');
            fail('should have thrown an error');
        } catch (error) {
            expect(error).toBeInstanceOf(SecondaryRequestError);
        }
    });
});

describe('revokeAccessToken', () => {
    it('makes a request to the Discord OAuth endpoint', async () => {
        mockedAxios.post.mockResolvedValueOnce({ data: 'test response' });
        const res = await revokeAccessToken(config, 'test access token');

        expect(res).toBeUndefined();

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('throws a SecondaryRequestError when the request fails', async () => {
        mockedAxios.post.mockImplementationOnce(() => {
            throw new Error();
        });

        try {
            await revokeAccessToken(config, 'test access token');
            fail('should have thrown an error');
        } catch (error) {
            expect(error).toBeInstanceOf(SecondaryRequestError);
        }
    });
});

describe('getAssociatedUser', () => {
    it('makes a request to the Discord User endpoint', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: 'test user' });
        const res = await getAssociatedUser('test access token');

        expect(res).toBe('test user');

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('throws a SecondaryRequestError when the request fails', async () => {
        mockedAxios.get.mockImplementationOnce(() => {
            throw new Error();
        });

        try {
            await getAssociatedUser('test access token');
            fail('should have thrown an error');
        } catch (error) {
            expect(error).toBeInstanceOf(SecondaryRequestError);
        }
    });
});
