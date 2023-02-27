import * as OpenApiValidator from 'express-openapi-validator';
import { mockedConfig } from '../tests/mockedConfig';
import { validatorMiddleware } from './validatorMiddleware';

jest.mock('express-openapi-validator');

const mockedValidator = jest.mocked(OpenApiValidator);

describe('validatorMiddleware', () => {
    it('invokes the underlying openAPI validator middleware', () => {
        validatorMiddleware(mockedConfig);

        expect(mockedValidator.middleware).toBeCalledTimes(1);
    });
});
