import { AuthService } from '../services/AuthService';
import { PermissionService } from '../services/PermissionService';
import { ServerService } from '../services/ServerService';
import { UserService } from '../services/UserService';

type MethodsOf<T> = { [k in keyof T]: T[k] };

const _mockedAuthService: MethodsOf<AuthService> = {
    loginOrSignup: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    validateSiteToken: jest.fn(),
};

export const mockedAuthService = _mockedAuthService as unknown as jest.Mocked<AuthService>;

const _mockedPermissionService: MethodsOf<PermissionService> = {
    hasPermissions: jest.fn(),
    splitPermissions: jest.fn(),
    checkCanChangePermissionsTo: jest.fn(),
    checkCanEditPermissionsOf: jest.fn(),
    checkCanChangeStatusTo: jest.fn(),
};

export const mockedPermissionService = _mockedPermissionService as unknown as jest.Mocked<PermissionService>;

const _mockedServerService: MethodsOf<ServerService> = {
    getServerById: jest.fn(),
    getAllServers: jest.fn(),
    createNewServer: jest.fn(),
    refreshExistingServer: jest.fn(),
    changeServerStatus: jest.fn(),
    changeServerTags: jest.fn(),
};

export const mockedServerService = _mockedServerService as unknown as jest.Mocked<ServerService>;

const _mockedUserService: MethodsOf<UserService> = {
    getUserById: jest.fn(),
    getAllUsers: jest.fn(),
    createNewUser: jest.fn(),
    refreshExistingUser: jest.fn(),
    updateUserPermissions: jest.fn(),
    updateUserSubmissionStats: jest.fn(),
    updateUserActionStats: jest.fn(),
};

export const mockedUserService = _mockedUserService as unknown as jest.Mocked<UserService>;
