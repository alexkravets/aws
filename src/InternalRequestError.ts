type Request = Record<string, unknown>;
export type OriginalError = Record<string, unknown>;

/** Internal system request error. */
class InternalRequestError extends Error {
  private _request: Request;
  private _originalError: OriginalError;

  /** Creates an instance of InternalRequestError. */
  constructor(request: Request, originalError: OriginalError) {
    const { message } = originalError;

    super(message as string);

    this._request = request;
    this._originalError = originalError;
  }

  /** Returns the original error returned by the service. */
  get originalError() {
    return this._originalError;
  }

  /** Returns a plain JavaScript object ready for JSON serialization. */
  toJSON() {
    return {
      error: this._originalError,
      request: this._request,
    };
  }
}

export default InternalRequestError;
