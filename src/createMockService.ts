import { got } from '@kravc/dos';
import { set, unset } from 'lodash';

import MockService from './MockService';

/** Returns mock service instance from the global scope. */
const getMockService = (): MockService => got(global, 'mockService', 'Mock service is not initialized.');

/** Starts the mock service. */
const startMocks = () => set(global, 'mockService', new MockService());

/** Stops the mock service. */
const stopMocks = () => unset(global, 'mockService');

/** Ensures all mocks have been resolved. */
const resolveMocks = () => getMockService().done();

/** Adds a mock for an operation request. */
const addMock = (operationId: string, responseJson: string | undefined = undefined) => {
  /** Parses response JSON and returns plain JS object. */
  const getResponse = (responseJson: string) => {
    const response = JSON.parse(responseJson);
    const { error } = response;

    if (error) {
      return { error };
    }

    return { data: response };
  };

  getMockService()
    .mock(
      operationId,
      (parameters?: Record<string, unknown>) => {
        console.info('[2m' + `${operationId}: ` + JSON.stringify(parameters, null, 2) + '\x1b[0m');
        return parameters;
      },
      (responseJson && getResponse(responseJson) || undefined)
    );
};

/** Creates an instance of the mock service. */
const createMockService = () => ({
  addMock,
  stopMocks,
  startMocks,
  resolveMocks,
  getMockService,
});

export default createMockService;
