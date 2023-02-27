/** Options for sorting an array of users. */
export enum UserSortOptions {
    /** Sort by Discord ID */
    Id,

    /** Sort by 'registered' timestamp. */
    Registered,

    /** Sort by 'last login or refresh' timestamp. */
    LastLoginOrRefresh,
}
