import { get } from 'lodash';
import MockService, { type Parameters, type Result } from './MockService';
import InternalRequestError from './InternalRequestError';
import { Lambda, type LambdaClientConfig } from '@aws-sdk/client-lambda';

export type Headers = Record<string, unknown>;
export type {
  Result,
  Parameters,
};

const DEFAULT_STAGE = 'dev';
const FUNCTION_NAME_POSTFIX = 'api';

/** Lambda service class. */
class LambdaService {
  private _lambda: Lambda;
  private _mockService: MockService | undefined;
  private _functionName: string;

  /** Creates an instance of lambda service for a specific function. */
  constructor(functionName: string, options: LambdaClientConfig) {
    const stage = get(process.env, 'NODE_APP_INSTANCE', DEFAULT_STAGE);

    this._lambda = new Lambda(options);
    this._mockService = get(global, 'mockService') as MockService | undefined;
    this._functionName = `${functionName}-${stage}-${FUNCTION_NAME_POSTFIX}`;
  }

  /** Processes execute response in JSON format. */
  _processResponse(operationId: string, parameters: Parameters, responseJson: string) {
    const response = JSON.parse(responseJson);

    const { body: resultJson } = response;

    if (!resultJson) {
      return;
    }

    const result = JSON.parse(resultJson) as Result;
    const { error } = result;

    if (!error) {
      return result;
    }

    throw new InternalRequestError({ operationId, parameters }, error);
  }

  /** Executes synchronous request to the lambda function and returns result. */
  async execute(
    operationId: string,
    parameters: Parameters = {},
    headers: Headers = {}
  ): Promise<Result | undefined> {
    if (this._mockService) {
      return this._mockService.request(operationId, parameters);
    }

    const { mutation: body, ...queryStringParameters } = parameters;

    const request = {
      body,
      headers,
      operationId,
      queryStringParameters
    };

    const Payload = JSON.stringify(request, null, 2);
    const FunctionName = this._functionName;

    const {
      Payload: payloadByteArray,
      StatusCode: statusCode,
      ...rest
    } = await this._lambda.invoke({ FunctionName, Payload });

    const payloadJson = payloadByteArray
      ? Buffer.from(payloadByteArray).toString()
      : '{}';

    const isSuccess = statusCode === 200;

    if (!isSuccess) {
      const responseJson = JSON.stringify({ payloadJson, ...rest }, null, 2);
      throw new Error(`Function "${FunctionName}/${operationId}" has failed` +
        ` with status: ${statusCode}, ${responseJson}`);
    }

    return this._processResponse(operationId, parameters, payloadJson);
  }

  /** Executes asynchronous request to the lambda function. */
  async executeAsync(
    operationId: string,
    parameters: Parameters = {},
    headers: Headers = {}
  ): Promise<void> {
    if (this._mockService) {
      this._mockService.request(operationId, parameters);
      return;
    }

    const { mutation: body, ...queryStringParameters } = parameters;

    const request = {
      body,
      headers,
      operationId,
      queryStringParameters
    };

    const InvokeArgs = JSON.stringify(request, null, 2);
    const FunctionName = this._functionName;

    await this._lambda.invokeAsync({ FunctionName, InvokeArgs });
  }
}

export default LambdaService;
