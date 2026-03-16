import config from 'config';
import { get } from 'lodash';
import { fromIni } from '@aws-sdk/credential-providers';
import type { LambdaClientConfig } from '@aws-sdk/client-lambda';
import LambdaService, { type Parameters, type Result } from './LambdaService';

const LOCAL_REGION = 'local';
const PRIVATE_PROFILE = 'private';

const options = {} as LambdaClientConfig;

/* istanbul ignore else */
if (process.env.NODE_ENV !== 'serverless') {
  const profile = get(config, 'aws.profile', PRIVATE_PROFILE);

  options.region = get(config, 'aws.region', LOCAL_REGION);
  options.credentials = fromIni({ profile });
}

/** Executes synchronous request to the lambda function. */
const execute = async <
  P extends Parameters = Parameters,
  R = Result
>(
  serviceName: string,
  operationId: string,
  parameters: P = {} as P
): Promise<R> => {
  const functionName = config.get(`services.${serviceName}`) as string;
  const lambdaService = new LambdaService(functionName, options);

  const result = await lambdaService.execute(operationId, parameters);

  return result as R;
};

/** Executes asynchronous request to the lambda function. */
const executeAsync = async <
  P extends Parameters = Parameters
>(
  serviceName: string,
  operationId: string,
  parameters: P = {} as P
): Promise<void> => {
  const functionName = config.get(`services.${serviceName}`) as string;
  const lambdaService = new LambdaService(functionName, options);

  await lambdaService.executeAsync(operationId, parameters);
};

export {
  execute,
  executeAsync,
};
