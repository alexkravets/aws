import createMockService from '../createMockService';
import InternalRequestError from '../InternalRequestError';

describe('createMockService()', () => {
  const { addMock, startMocks, stopMocks, resolveMocks, getMockService } = createMockService();

  const operationId = 'testOperation';
  const responseJson = JSON.stringify({ foo: 'bar' });

  describe('addMock(operationId, responseJson?)', () => {
    it('throws when mock service is not initialized', () => {
      expect(() => addMock(operationId, responseJson))
        .toThrow('Mock service is not initialized.');
    });

    it('registers mock with parsed response data', async () => {
      startMocks();
      const operationId = 'testOperation';

      addMock(operationId, responseJson);

      const mockService = getMockService();
      const parameters = { param: 1 };
      const result = await mockService.request(operationId, parameters);

      expect(result).toEqual({ data: { foo: 'bar' } });
      resolveMocks();
    });

    it('registers mock without response data when responseJson is undefined', async () => {
      addMock(operationId);

      const mockService = getMockService();
      const parameters = { param: 1 };
      const result = await mockService.request(operationId, parameters);

      expect(result).toEqual(undefined);
      resolveMocks();
    });
  });

  describe('resolveMocks()', () => {
    it('throws when there are unresolved mocks', () => {
      addMock('unresolvedOperation');

      expect(() => resolveMocks())
        .toThrow('Following mocks have not been resolved:');
    });
  });

  describe('getMockService().request()', () => {
    it('throws when requesting an operation that was not mocked', async () => {
      startMocks();

      await expect(getMockService().request('unknownOp', {}))
        .rejects.toThrow('Operation mock is not found for `unknownOp`');

      stopMocks();
    });

    it('throws InternalRequestError when mock result contains error', async () => {
      startMocks();
      const error = { message: 'Bad', code: 'ERR' };
      addMock('errOp', JSON.stringify({ error }));

      await expect(getMockService().request('errOp', {}))
        .rejects.toThrow(InternalRequestError);

      stopMocks();
    });
  });
});
