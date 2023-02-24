export interface PaginationQueryParameters {
    page: number;
    perPage: number;
}

export interface WithPagination<T> {
    totalItemCount: number;
    items: T[];
}
