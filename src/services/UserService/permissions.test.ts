import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';
import { hasPermission } from './permissions';

describe('hasPermission', () => {
    const permissions = UserPermissions.Favourite | UserPermissions.Feature | UserPermissions.MakeApplications;

    it('works with user objects', () => {
        const user = { permissions } as User<true>;

        expect(hasPermission(user, UserPermissions.MakeLotsOfApplications)).toBe(false);

        expect(hasPermission(user, UserPermissions.Favourite)).toBe(true);

        expect(hasPermission(user, UserPermissions.Favourite | UserPermissions.MakeLotsOfApplications)).toBe(false);

        expect(hasPermission(user, UserPermissions.Favourite | UserPermissions.Feature)).toBe(true);
    });

    it('works with permissions bitfields', () => {
        expect(hasPermission(permissions, UserPermissions.MakeLotsOfApplications)).toBe(false);

        expect(hasPermission(permissions, UserPermissions.Favourite)).toBe(true);

        expect(hasPermission(permissions, UserPermissions.Favourite | UserPermissions.MakeLotsOfApplications)).toBe(
            false,
        );

        expect(hasPermission(permissions, UserPermissions.Favourite | UserPermissions.Feature)).toBe(true);
    });
});
