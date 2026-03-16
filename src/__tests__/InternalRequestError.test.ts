import InternalRequestError from '../InternalRequestError';

describe('InternalRequestError', () => {
  const request = { path: '/test', payload: { id: 1 } };
  const originalError = { message: 'Something went wrong', code: 'ERR_CODE' };

  it('sets the error message from the original error', () => {
    const error = new InternalRequestError(request, originalError);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(originalError.message);
  });

  it('exposes the original error via the originalError getter', () => {
    const error = new InternalRequestError(request, originalError);

    expect(error.originalError).toBe(originalError);
  });

  it('serializes to JSON with error and request', () => {
    const error = new InternalRequestError(request, originalError);

    expect(error.toJSON()).toEqual({
      error: originalError,
      request,
    });
  });
});
