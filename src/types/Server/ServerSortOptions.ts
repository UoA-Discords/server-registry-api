/** Options for sorting an array of servers. */
export enum ServerSortOptions {
    /** Sort by Discord ID. */
    Id,
    /** Sort by status. */
    Status,
    /** Sort by name. */
    Name,
    /** Sort by 'created at' timestamp. */
    CreatedAt,
    /** Sort by approximate count of total members (may be outdated). */
    MemberCount,
}
