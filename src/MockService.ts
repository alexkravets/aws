import InternalRequestError, { OriginalError } from './InternalRequestError';

export type Parameters = Record<string, unknown>;

export interface Result {
  data?: Record<string, unknown> | Record<string, unknown>[],
  error?: OriginalError,
};

interface Mock {
  operationId: string;
  handler: (parameters: Parameters) => void;
  result: Result | undefined;
}

/** Default handler for mock service, returns parameters without modification. */
const defaultParametersHandler = (parameters?: Parameters): Parameters | void => parameters;

/** Mock service for system service requests. */
class MockService {
  private _operationMocks: Mock[] = [];

  /** Creates mock service instance. */
  constructor() {
    this._operationMocks = [];
  }

  /** Adds mock for operation request. */
  mock(operationId: string, parametersHandler: typeof defaultParametersHandler, result: Result | undefined) {
    /* istanbul ignore next */
    const mock = { operationId, result, handler: parametersHandler || defaultParametersHandler };
    this._operationMocks.push(mock);
  }

  /** Resolves the requested operation and returns mocked result. */
  async request(operationId: string, parameters: Parameters) {
    const index = this._operationMocks
      .findIndex(operation => operation.operationId === operationId);

    const operationMock = this._operationMocks[index];

    if (!operationMock) {
      throw new Error(`Operation mock is not found for \`${operationId}\``);
    }

    this._operationMocks.splice(index, 1);

    const { handler } = operationMock;

    handler(parameters);

    if (operationMock.result?.error) {
      const { result: { error } } = operationMock;
      throw new InternalRequestError({ operationId, parameters }, error);
    }

    return operationMock.result;
  }

  /** Ensures that all mocks added to the stack have been resolved. */
  done() {
    const isAllMocksResolved = this._operationMocks.length === 0;

    if (isAllMocksResolved) {
      return;
    }

    const json = JSON.stringify(this._operationMocks, null, 2);

    this._operationMocks = [];
    throw new Error(`Following mocks have not been resolved: ${json}`);
  }
}

export default MockService;
