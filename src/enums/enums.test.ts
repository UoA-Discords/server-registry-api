/** Sanity checks for fake enums, basically just ensuring we're not skipping a value anywhere. */

import { EntryFacultyTags } from './EntryFacultyTags';
import { UserPermissions } from './UserPermissions';
import { ServerStatus } from './ServerStatus';
import { ServerStatusAction } from './ServerStatusAction';

describe('enums', () => {
    /** Checks whether all the values of a 'fake' enum are unique. */
    function noDuplicateValues(e: Record<string, number>): boolean {
        const allValues = Object.values(e);

        const uniqueValues = new Set(allValues);

        return allValues.length === uniqueValues.size;
    }

    /**
     * Checks whether all the values of a 'fake' enum are continuous, consecutive, and start at the right number.
     *
     * For bitfields, the values must start at 1 and incrementally double in value.
     * Otherwise, the values must start at 0 and increment by 1.
     *
     */
    function continuousValues(e: Record<string, number>, bitfield?: boolean): boolean {
        const allValues = Object.values(e).sort((a, b) => a - b);

        const startValue = bitfield ? 1 : 0;

        if (allValues[0] !== startValue) {
            throw new Error(`Incorrect starting value (should be ${startValue}, got ${allValues[0]})`);
        }

        const nextValue: (currentValue: number) => number = bitfield ? (c) => c << 1 : (c) => c + 1;

        for (let i = 0, len = allValues.length - 1; i < len; i++) {
            const currentValue = allValues[i];
            const expectedNextValue = nextValue(currentValue);
            const actualNextValue = allValues[i + 1];
            if (expectedNextValue !== actualNextValue) {
                const valueKeyMap = Object.assign({}, ...Object.keys(e).map((key) => ({ [e[key]]: key })));

                const valueToString: (v: number) => string = bitfield ? (v) => `1 << ${Math.log2(v)}` : toString;

                throw new Error(
                    `Discontinuous value for ${valueKeyMap[currentValue]} (${valueToString(
                        currentValue,
                    )}), next key is ${valueKeyMap[actualNextValue]} (${valueToString(
                        actualNextValue,
                    )}) but be (${valueToString(expectedNextValue)})`,
                );
            }
        }

        return true;
    }

    describe('UserPermissions', () => {
        it('has no duplicate values', () => {
            expect(noDuplicateValues(UserPermissions)).toBe(true);
        });

        it('has continuous values', () => {
            expect(continuousValues(UserPermissions, true)).toBe(true);
        });
    });

    describe('ServerStatus', () => {
        it('has no duplicate values', () => {
            expect(noDuplicateValues(ServerStatus)).toBe(true);
        });

        it('has continuous values', () => {
            expect(continuousValues(ServerStatus)).toBe(true);
        });
    });

    describe('ServerStatusAction', () => {
        it('has no duplicate values', () => {
            expect(noDuplicateValues(ServerStatusAction)).toBe(true);
        });

        it('has continuous values', () => {
            expect(continuousValues(ServerStatusAction)).toBe(true);
        });
    });

    describe('EntryFacultyTags', () => {
        it('has no duplicate values', () => {
            expect(noDuplicateValues(EntryFacultyTags)).toBe(true);
        });

        it('has continuous values', () => {
            expect(continuousValues(EntryFacultyTags, true)).toBe(true);
        });
    });
});
