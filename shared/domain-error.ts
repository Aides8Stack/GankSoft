export class DomainError extends Error {
  code: string;
  fieldErrors: Record<string, string>;
  retryable: boolean;
  constructor(
    code: string,
    message: string,
    fieldErrors: Record<string, string> = {},
    retryable = false,
  ) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.retryable = retryable;
  }
}
export function errorResponse(error: unknown) {
  return {
    ok: false as const,
    error: error instanceof Error ? error.message : '操作失败',
    code: error instanceof DomainError ? error.code : 'OPERATION_REJECTED',
    fieldErrors: error instanceof DomainError ? error.fieldErrors : {},
    retryable: error instanceof DomainError ? error.retryable : false,
    definitive: true,
  };
}
