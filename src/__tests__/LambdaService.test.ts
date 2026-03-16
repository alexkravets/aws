import LambdaService, { type Parameters } from '../LambdaService';
import createMockService from '../createMockService';
import InternalRequestError from '../InternalRequestError';

const { addMock, resolveMocks, startMocks, stopMocks } = createMockService();

describe('LambdaService', () => {
  const functionName = 'test-function';
  const lambdaConfig = { region: 'eu-central-1' };
  const originalNodeAppInstance = process.env.NODE_APP_INSTANCE;

  beforeEach(() => {
    stopMocks();
    delete process.env.NODE_APP_INSTANCE;
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalNodeAppInstance !== undefined) {
      process.env.NODE_APP_INSTANCE = originalNodeAppInstance;
    } else {
      delete process.env.NODE_APP_INSTANCE;
    }

    stopMocks();
  });

  // eslint-disable-next-line jsdoc/require-jsdoc
  const createServiceWithLambdaMocks = () => {
    const service = new LambdaService(functionName, lambdaConfig);

    const invoke = jest.fn();
    const invokeAsync = jest.fn();

    // Override the internal Lambda client with mocked methods.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any)._lambda = { invoke, invokeAsync };

    return { service, invoke, invokeAsync };
  };

  describe('execute(operationId, parameters, headers)', () => {
    describe('when mock service is not available', () => {
      it('invokes Lambda with correct payload and parses successful response', async () => {
        const { service, invoke } = createServiceWithLambdaMocks();

        const operationId = 'operation';
        const parameters: Parameters = {
          mutation: { id: 1 },
          filter: 'active',
        };
        const headers = { 'x-header': 'value' };

        const lambdaResponse = {
          body: JSON.stringify({ data: { id: 1 } }),
        };

        const payloadBuffer = Buffer.from(JSON.stringify(lambdaResponse));

        invoke.mockResolvedValue({
          Payload: payloadBuffer,
          StatusCode: 200,
        });

        const result = await service.execute(operationId, parameters, headers);

        expect(invoke).toHaveBeenCalledWith({
          FunctionName: `${functionName}-dev-api`,
          Payload: JSON.stringify(
            {
              body: parameters.mutation,
              headers,
              operationId,
              queryStringParameters: { filter: 'active' },
            },
            null,
            2,
          ),
        });

        expect(result).toEqual({ data: { id: 1 } });
      });

      it('uses NODE_APP_INSTANCE environment variable in function name', async () => {
        process.env.NODE_APP_INSTANCE = 'staging';

        const { service, invoke } = createServiceWithLambdaMocks();
        const operationId = 'operation';

        invoke.mockResolvedValue({
          Payload: Buffer.from(JSON.stringify({})),
          StatusCode: 200,
        });

        await service.execute(operationId);

        expect(invoke).toHaveBeenCalledWith(
          expect.objectContaining({
            FunctionName: `${functionName}-staging-api`,
          }),
        );
      });

      it('throws when Lambda returns non-200 status code', async () => {
        const { service, invoke } = createServiceWithLambdaMocks();

        const operationId = 'failedOperation';

        invoke.mockResolvedValue({
          Payload: Buffer.from('{}'),
          StatusCode: 500,
          FunctionError: 'Unhandled',
        });

        await expect(service.execute(operationId)).rejects.toThrow(
          'has failed with status: 500',
        );
      });

      it('returns undefined when response has no body', async () => {
        const { service, invoke } = createServiceWithLambdaMocks();

        invoke.mockResolvedValue({
          Payload: Buffer.from(JSON.stringify({})),
          StatusCode: 200,
        });

        const result = await service.execute('no-body-operation');

        expect(result).toBeUndefined();
      });

      it('handles missing Payload from Lambda (uses empty JSON)', async () => {
        const { service, invoke } = createServiceWithLambdaMocks();

        invoke.mockResolvedValue({
          Payload: undefined,
          StatusCode: 200,
        });

        const result = await service.execute('no-payload-operation');

        expect(result).toBeUndefined();
      });

      it('throws InternalRequestError when response contains error', async () => {
        const { service, invoke } = createServiceWithLambdaMocks();

        const operationId = 'operation-with-error';
        const originalError = { message: 'Boom', code: 'ERR' };

        const responseBody = {
          body: JSON.stringify({ error: originalError }),
        };

        invoke.mockResolvedValue({
          Payload: Buffer.from(JSON.stringify(responseBody)),
          StatusCode: 200,
        });

        await expect(service.execute(operationId)).rejects.toBeInstanceOf(
          InternalRequestError,
        );
      });
    });

    describe('when mock service is available', () => {
      it('delegates to the mock service', async () => {
        startMocks();

        const operationId = 'testOperation';
        const responseJson = JSON.stringify({ foo: 'bar' });

        addMock(operationId, responseJson);

        const service = new LambdaService(functionName, lambdaConfig);
        const parameters: Parameters = { mutation: { field: 'value' } };

        const result = await service.execute(operationId, parameters);

        expect(result).toEqual({ data: { foo: 'bar' } });

        expect(() => resolveMocks()).not.toThrow();
      });
    });
  });

  describe('executeAsync(operationId, parameters, headers)', () => {
    describe('when mock service is not available', () => {
      it('invokes Lambda asynchronously with correct payload', async () => {
        const { service, invokeAsync } = createServiceWithLambdaMocks();

        const operationId = 'asyncOperation';
        const parameters: Parameters = {
          mutation: { id: 1 },
          offset: 10,
        };
        const headers = { 'x-header': 'value' };

        invokeAsync.mockResolvedValue(undefined);

        await service.executeAsync(operationId, parameters, headers);

        expect(invokeAsync).toHaveBeenCalledWith({
          FunctionName: `${functionName}-dev-api`,
          InvokeArgs: JSON.stringify(
            {
              body: parameters.mutation,
              headers,
              operationId,
              queryStringParameters: { offset: 10 },
            },
            null,
            2,
          ),
        });
      });

      it('uses default parameters when omitted', async () => {
        const { service, invokeAsync } = createServiceWithLambdaMocks();

        const operationId = 'asyncOperationDefaults';

        invokeAsync.mockResolvedValue(undefined);

        await service.executeAsync(operationId);

        expect(invokeAsync).toHaveBeenCalledWith({
          FunctionName: `${functionName}-dev-api`,
          InvokeArgs: JSON.stringify(
            {
              body: undefined,
              headers: {},
              operationId,
              queryStringParameters: {},
            },
            null,
            2,
          ),
        });
      });
    });

    describe('when mock service is available', () => {
      it('delegates to the mock service', async () => {
        startMocks();

        const operationId = 'asyncOperation';

        addMock(operationId);

        const service = new LambdaService(functionName, lambdaConfig);
        const parameters: Parameters = { mutation: { id: 1 } };

        await service.executeAsync(operationId, parameters);

        expect(() => resolveMocks()).not.toThrow();
      });
    });
  });
});
