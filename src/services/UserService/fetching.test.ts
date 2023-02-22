import { UserModel } from '../../models/UserModel';
import { getUserbyId } from './fetching';

describe('getUserById', () => {
    it('calls userModel.findOne', async () => {
        const findFn = jest.fn();

        await getUserbyId({ findOne: findFn } as unknown as UserModel, '123');

        expect(findFn).toBeCalledTimes(1);
        expect(findFn).toBeCalledWith({ _id: '123' });
    });
});
