jest.mock('@aws-sdk/credential-providers', () => ({
  fromIni: jest.fn(() => () => ({})),
}));

import createMockService from '../createMockService';
import { execute, executeAsync } from '../';

const {
  addMock,
  startMocks,
  stopMocks,
  resolveMocks,
} = createMockService();

const originalNodeEnv = process.env.NODE_ENV;

describe('execute helpers', () => {
  const serviceName = 'example';

  beforeEach(() => {
    stopMocks();
    jest.clearAllMocks();
  });

  afterAll(() => {
    stopMocks();

    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('execute', () => {
    it('executes synchronously using mock service', async () => {
      startMocks();

      const operationId = 'getItem';
      const responseJson = JSON.stringify({ foo: 'bar' });

      addMock(operationId, responseJson);

      const result = await execute(serviceName, operationId, {
        mutation: { id: '1' },
      });

      expect(result).toEqual({ data: { foo: 'bar' } });
      expect(() => resolveMocks()).not.toThrow();
    });

    it('uses default parameters when omitted', async () => {
      startMocks();

      const operationId = 'getItemDefaultParams';
      const responseJson = JSON.stringify({ foo: 'baz' });

      addMock(operationId, responseJson);

      const result = await execute(serviceName, operationId);

      expect(result).toEqual({ data: { foo: 'baz' } });
      expect(() => resolveMocks()).not.toThrow();
    });
  });

  describe('executeAsync', () => {
    it('executes asynchronously using mock service', async () => {
      startMocks();

      const operationId = 'sendEvent';

      addMock(operationId);

      await executeAsync(serviceName, operationId, {
        mutation: { type: 'ping' },
      });

      expect(() => resolveMocks()).not.toThrow();
    });

    it('uses default parameters when omitted', async () => {
      startMocks();

      const operationId = 'sendEventDefaultParams';

      addMock(operationId);

      await executeAsync(serviceName, operationId);

      expect(() => resolveMocks()).not.toThrow();
    });
  });
});
