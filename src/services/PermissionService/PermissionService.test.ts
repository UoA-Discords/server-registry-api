import { ForbiddenError } from '../../errors/ForbiddenError';
import { mockedUser } from '../../tests/mockedUser';
import { ServerStatus } from '../../types/Server/ServerStatus';
import { ServerStatusAction } from '../../types/Server/ServerStatusAction';
import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';
import { PermissionService } from '../PermissionService';

describe('PermissionService', () => {
    const ownerUser: User = {
        ...mockedUser,
        permissions:
            UserPermissions.Owner |
            UserPermissions.ManageUsers |
            UserPermissions.Feature |
            UserPermissions.ManageServers,
        _id: 'owner',
    };
    const adminUser: User = {
        ...mockedUser,
        permissions: UserPermissions.ManageUsers | UserPermissions.ManageServers,
        _id: 'admin',
    };
    const normalUser: User = { ...mockedUser, permissions: UserPermissions.None, _id: 'normal' };

    describe(PermissionService['hasPermissions'].name, () => {
        const permissions = UserPermissions.Favourite | UserPermissions.Feature | UserPermissions.MakeApplications;
        const permissionsSubset = permissions & (UserPermissions.Favourite | UserPermissions.MakeApplications);
        const permissionsSuperset = permissions | UserPermissions.Owner;

        it('returns true when the target has all of the permissions', () => {
            expect(PermissionService['hasPermissions'](permissions, permissions)).toBe(true);
            expect(PermissionService['hasPermissions'](permissionsSuperset, permissions)).toBe(true);
        });

        it('returns false when the target is missing any of the permissions', () => {
            expect(PermissionService['hasPermissions'](permissionsSubset, permissions)).toBe(false);
        });
    });

    describe(PermissionService.splitPermissions.name, () => {
        it('splits a permissions bitfield', () => {
            const permissions = UserPermissions.Favourite | UserPermissions.Feature | UserPermissions.MakeApplications;

            const splitPermissions = PermissionService.splitPermissions(permissions);

            expect(splitPermissions).toEqual(
                expect.arrayContaining([
                    UserPermissions.Favourite,
                    UserPermissions.Feature,
                    UserPermissions.MakeApplications,
                ]),
            );
        });
    });

    describe(PermissionService.checkCanChangePermissionsTo.name, () => {
        it('passes when the permissions are equal', () => {
            PermissionService.checkCanChangePermissionsTo(normalUser, 0, 0);
        });

        it("throws a ForbiddenError when the 'Owner' permission is being added or removed", () => {
            const withoutOwner = UserPermissions.Favourite | UserPermissions.Feature | UserPermissions.MakeApplications;
            const withOwner = withoutOwner | UserPermissions.Owner;

            // adding
            expect(() => PermissionService.checkCanChangePermissionsTo(normalUser, withoutOwner, withOwner)).toThrow(
                ForbiddenError,
            );

            // removing
            expect(() => PermissionService.checkCanChangePermissionsTo(normalUser, withOwner, withoutOwner)).toThrow(
                ForbiddenError,
            );
        });

        it("throws a ForbiddenError when a non-owner is trying to add or remove the 'Manage Users' permission", () => {
            const withoutManageUsers = UserPermissions.Favourite | UserPermissions.Feature;
            const withManageUsers = withoutManageUsers | UserPermissions.ManageUsers;

            // adding
            expect(() =>
                PermissionService.checkCanChangePermissionsTo(adminUser, withoutManageUsers, withManageUsers),
            ).toThrow(ForbiddenError);

            // removing
            expect(() =>
                PermissionService.checkCanChangePermissionsTo(adminUser, withManageUsers, withoutManageUsers),
            ).toThrow(ForbiddenError);
        });

        it("passes when an owner is trying to add or remove the 'Manage Users' permission", () => {
            const withoutManageUsers = UserPermissions.Favourite | UserPermissions.Feature;
            const withManageUsers = withoutManageUsers | UserPermissions.ManageUsers;

            // adding
            PermissionService.checkCanChangePermissionsTo(ownerUser, withoutManageUsers, withManageUsers);

            // removing
            PermissionService.checkCanChangePermissionsTo(ownerUser, withManageUsers, withoutManageUsers);
        });
    });

    describe(PermissionService.checkCanEditPermissionsOf.name, () => {
        it("throws a ForbiddenError when the conductor does not have the 'Manage Users' permission", () => {
            expect(() => PermissionService.checkCanEditPermissionsOf(normalUser, normalUser)).toThrow(ForbiddenError);
        });

        it("passes when a user with the 'Manage Users' permission is editing themselves", () => {
            PermissionService.checkCanEditPermissionsOf(adminUser, adminUser);
        });

        it("throws a ForbiddenError if the target user has the 'Owner' permission and they are not also the conductor", () => {
            expect(() => PermissionService.checkCanEditPermissionsOf(adminUser, ownerUser)).toThrow(ForbiddenError);
        });

        it("throws a ForbiddenError if the target user has the 'Manage Users' permission and the conductor doesn't have the 'Owner' permission", () => {
            const adminUser2: User = { ...adminUser, _id: 'admin user 2' };
            expect(() => PermissionService.checkCanEditPermissionsOf(adminUser, adminUser2)).toThrow(ForbiddenError);
        });
    });

    describe(PermissionService.validateServerStatusChange.name, () => {
        const allStatusesBesides = (...relevantStatuses: ServerStatus[]) =>
            [
                ServerStatus.Pending,
                ServerStatus.Rejected,
                ServerStatus.Public,
                ServerStatus.Withdrawn,
                ServerStatus.Featured,
            ].filter((s) => !relevantStatuses.includes(s));

        it("throws a ForbiddenError if the conductor does not have the 'ManageServers' permission", () => {
            try {
                PermissionService.validateServerStatusChange(normalUser, ServerStatus.Pending, ServerStatus.Public);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(ForbiddenError);
            }
        });

        describe('pending servers', () => {
            const determine = (newStatus: ServerStatus) =>
                PermissionService.validateServerStatusChange(ownerUser, ServerStatus.Pending, newStatus);

            it('recognizes accept', () => {
                expect(determine(ServerStatus.Public)).toBe(ServerStatusAction.Accept);
            });

            it('recognizes reject', () => {
                expect(determine(ServerStatus.Rejected)).toBe(ServerStatusAction.Reject);
            });

            it('throws a ForbiddenError for all other statuses', () => {
                allStatusesBesides(ServerStatus.Public, ServerStatus.Rejected).forEach((e) => {
                    expect(() => determine(e)).toThrowError(ForbiddenError);
                });
            });
        });

        describe('rejected servers', () => {
            const determine = (newStatus: ServerStatus) =>
                PermissionService.validateServerStatusChange(ownerUser, ServerStatus.Rejected, newStatus);

            it('recognizes reconsider', () => {
                expect(determine(ServerStatus.Public)).toBe(ServerStatusAction.Reconsider);
            });

            it('throws a ForbiddenError for all other statuses', () => {
                allStatusesBesides(ServerStatus.Public).forEach((e) => {
                    expect(() => determine(e)).toThrowError(ForbiddenError);
                });
            });
        });

        describe('public servers', () => {
            const determine = (newStatus: ServerStatus) =>
                PermissionService.validateServerStatusChange(ownerUser, ServerStatus.Public, newStatus);

            it('recognizes withdraw', () => {
                expect(determine(ServerStatus.Withdrawn)).toBe(ServerStatusAction.Withdraw);
            });

            it('recognizes feature', () => {
                expect(determine(ServerStatus.Featured)).toBe(ServerStatusAction.Feature);
            });

            it("recognizes feature - throws a ForbiddenError if the conductor does not have the 'FeatureServers' permission", () => {
                try {
                    PermissionService.validateServerStatusChange(adminUser, ServerStatus.Public, ServerStatus.Featured);
                    fail('should have thrown an error');
                } catch (error) {
                    expect(error).toBeInstanceOf(ForbiddenError);
                }
            });

            it('throws a ForbiddenError for all other statuses', () => {
                allStatusesBesides(ServerStatus.Withdrawn, ServerStatus.Featured).forEach((e) => {
                    expect(() => determine(e)).toThrowError(ForbiddenError);
                });
            });
        });

        describe('withdrawn servers', () => {
            const determine = (newStatus: ServerStatus) =>
                PermissionService.validateServerStatusChange(ownerUser, ServerStatus.Withdrawn, newStatus);

            it('recognizes delete', () => {
                expect(determine(ServerStatus.Rejected)).toBe(ServerStatusAction.Delete);
            });

            it('recognizes reinstate', () => {
                expect(determine(ServerStatus.Public)).toBe(ServerStatusAction.Reinstate);
            });

            it('throws a ForbiddenError for all other statuses', () => {
                allStatusesBesides(ServerStatus.Rejected, ServerStatus.Public).forEach((e) => {
                    expect(() => determine(e)).toThrowError(ForbiddenError);
                });
            });
        });

        describe('featured servers', () => {
            const determine = (newStatus: ServerStatus) =>
                PermissionService.validateServerStatusChange(ownerUser, ServerStatus.Featured, newStatus);

            it('recognizes unfeature', () => {
                expect(determine(ServerStatus.Public)).toBe(ServerStatusAction.Unfeature);
            });

            it("recognizes unfeatured - throws a ForbiddenError if the conductor does not have the 'FeatureServers' permission", () => {
                try {
                    PermissionService.validateServerStatusChange(adminUser, ServerStatus.Featured, ServerStatus.Public);
                    fail('should have thrown an error');
                } catch (error) {
                    expect(error).toBeInstanceOf(ForbiddenError);
                }
            });

            it('throws a ForbiddenError for all other statuses', () => {
                allStatusesBesides(ServerStatus.Public).forEach((e) => {
                    expect(() => determine(e)).toThrowError(ForbiddenError);
                });
            });
        });
    });
});
