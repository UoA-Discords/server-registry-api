import { ValuesOf } from '../types/utility';

/**
 * Tags for servers that describe the general faculty/faculties they pertain to.
 *
 * Servers can have any combination of these tags, as long as they are somewhat relevant.
 *
 * Servers can also have no tags, in which case their value here would be 0.
 */
export const EntryFacultyTags = {
    Arts: 1 << 0,
    Business: 1 << 1,
    Club: 1 << 2,
    ComputerScience: 1 << 3,
    CreativeArts: 1 << 4,
    Education: 1 << 5,
    Engineering: 1 << 6,
    HealthAndMedicine: 1 << 7,
    Law: 1 << 8,
    Research: 1 << 9,
    Science: 1 << 10,
    Statistics: 1 << 11,
};
export type EntryFacultyTags = ValuesOf<typeof EntryFacultyTags>;
