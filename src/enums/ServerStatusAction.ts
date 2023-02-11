import { ValuesOf } from '../types/utility';

/** Actions that can be taken on a server that pertain to its status. */
export const ServerStatusAction = {
    /** Accept a pending server, changing its status to public. */
    Accept: 0,

    /** Delete a pending server, changing its status to rejected. */
    Reject: 1,

    /** Withdraw a public server, changing its status to withdrawn. */
    Withdraw: 2,

    /** Delete a withdrawn server, changing its status to rejected. */
    Delete: 3,

    /** Reinstate a withdrawn server, changing its status back to public. */
    Reinstate: 4,

    /** Reconsider a rejected server, changing its status to public. */
    Reconsider: 5,

    /** Feature a public server, changing its status to featured.  */
    Feature: 6,

    /** Unfeature a featured server, changing its status back to public. */
    Unfeature: 7,
};
export type ServerStatusAction = ValuesOf<typeof ServerStatusAction>;
