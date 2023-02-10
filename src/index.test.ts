import { add, multiply, subtract } from '.';

describe('add', () => {
    it('adds 2 numbers', () => {
        expect(add(2, 3)).toBe(5);
    });
});

describe('subtract', () => {
    it('subtracts 2 numbers', () => {
        expect(subtract(5, 3)).toBe(2);
    });
});
