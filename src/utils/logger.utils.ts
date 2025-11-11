/**
 * Logger Utility
 * Centralized logging with different levels
 */

export enum LogLevel {
	DEBUG = 'DEBUG',
	INFO = 'INFO',
	WARN = 'WARN',
	ERROR = 'ERROR',
}

/**
 * Logger class for structured logging
 */
export class Logger {
	private context: string;

	constructor(context: string) {
		this.context = context;
	}

	/**
	 * Format log message with context and timestamp
	 */
	private formatMessage(level: LogLevel, message: string, data?: any): string {
		const timestamp = new Date().toISOString();
		const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
		return `[${timestamp}] [${level}] [${this.context}] ${message}${dataStr}`;
	}

	/**
	 * Log debug message
	 */
	debug(message: string, data?: any): void {
		console.log(this.formatMessage(LogLevel.DEBUG, message, data));
	}

	/**
	 * Log info message
	 */
	info(message: string, data?: any): void {
		console.log(this.formatMessage(LogLevel.INFO, message, data));
	}

	/**
	 * Log warning message
	 */
	warn(message: string, data?: any): void {
		console.warn(this.formatMessage(LogLevel.WARN, message, data));
	}

	/**
	 * Log error message
	 */
	error(message: string, error?: any): void {
		const errorData = error instanceof Error ? {
			name: error.name,
			message: error.message,
			stack: error.stack,
		} : error;
		console.error(this.formatMessage(LogLevel.ERROR, message, errorData));
	}
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
	return new Logger(context);
}
