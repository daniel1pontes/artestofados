interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  context?: string;
  error?: {
    message: string;
    stack?: string;
  };
  data?: any;
}

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(
    level: LogEntry["level"],
    message: string,
    error?: Error,
    data?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      data,
    };
  }

  info(message: string, data?: any): void {
    const logEntry = this.formatMessage("info", message, undefined, data);
    console.log(JSON.stringify(logEntry));
  }

  warn(message: string, data?: any): void {
    const logEntry = this.formatMessage("warn", message, undefined, data);
    console.warn(JSON.stringify(logEntry));
  }

  error(message: string, error?: Error, data?: any): void {
    const logEntry = this.formatMessage("error", message, error, data);
    console.error(JSON.stringify(logEntry));
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === "development") {
      const logEntry = this.formatMessage("debug", message, undefined, data);
      console.debug(JSON.stringify(logEntry));
    }
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}

export default Logger;
