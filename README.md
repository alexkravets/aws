# @kravc/aws

Helpers for making synchronous and asynchronous internal requests to AWS Lambda functions.

## Usage Example

Real request to a Lambda:

```ts
import { execute, createMockService } from '@kravc/aws';

type Payload = { userId: string };
type Response = { status: 'ok'; name: string };

const serviceName = 'users-service';
const operationId = 'ReadUser';
const result = await execute<Payload, Response>(serviceName, operationId, {
  userId: '123',
});

console.log(result.name);
```

Mock of a successful response for the request in tests:

```ts
const { addMock, startMocks, stopMocks, resolveMocks } = createMockService();

const operationId = 'ReadUser';

startMocks();
addMock(operationId, '{ "name": "John Doe" }');
resolveMocks();
stopMocks();
```

Mock of an error response for the request in tests:

```ts
const { addMock, startMocks, stopMocks, resolveMocks } = createMockService();

const operationId = 'ReadUser';

startMocks();
addMock(operationId, JSON.stringify({ error: { message: 'User not found.' } }));
resolveMocks();
stopMocks();
```

## License

ISC

---

Revision: March 16, 2026<br/>
By: Oleksandr Kravets (@alexkravets)
