import { ValuesOf } from '../types/utility';

export const UserPermissions = {
    /** This user can favourite up to 3 servers. */
    Favourite: 1 << 0,

    /** This user can make pending servers for the registry (max 1 concurrent). */
    MakeApplications: 1 << 1,

    /**
     * This user can make multiple concurrent pending servers for the registry (max 10 concurrent).
     *
     * Note this is useless without the {@link RegistryUserPermissions.MakeApplications MakeApplications} permission.
     */
    MakeLotsOfApplications: 1 << 2,

    /** This user can change the status of servers (excluding featuring and unfeaturing). */
    ManageServers: 1 << 3,

    /** This user can feature and unfeature servers. */
    Feature: 1 << 4,

    /**
     * This user can assign and remove any of the above permissions from:
     * - Other users who do not have this permission or the {@link UserPermissions.Owner Owner} permission.
     * - Themselves.
     */
    ManageUsers: 1 << 5,

    /**
     * This user can assign and remove any of the above permission from:
     * - Other users who do not have this permission.
     * - Themselves.
     */
    Owner: 1 << 6,
};
export type UserPermissions = ValuesOf<typeof UserPermissions>;
