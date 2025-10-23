export class ProviderError extends Error {
  constructor(message, code, provider, metadata = {}) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.provider = provider;
    this.metadata = { ...metadata };

    if (metadata?.statusCode && typeof metadata.statusCode === "number") {
      this.statusCode = metadata.statusCode;
    }

    if (metadata?.cause) {
      this.cause = metadata.cause;
    }

    const overrideRecoverable =
      typeof metadata?.recoverable === "boolean"
        ? metadata.recoverable
        : undefined;

    this.recoverable =
      overrideRecoverable !== undefined
        ? overrideRecoverable
        : this.calculateRecoverability();
  }

  calculateRecoverability() {
    const fatalCodes = [
      "INVALID_KEY",
      "AUTH_FAILED",
      "MODEL_NOT_FOUND",
      "FATAL",
      "INVALID_REQUEST",
    ];
    return !fatalCodes.includes(this.code);
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      provider: this.provider,
      recoverable: this.recoverable,
      metadata: this.metadata,
    };
  }
}

export default ProviderError;
