// Catches every unhandled exception (HTTP and non-HTTP), serializes it into a
// consistent { statusCode, error, message, requestId, timestamp, path } envelope,
// logs the error with pino, and sends the JSON response.
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { PinoLogger } from 'nestjs-pino';
import type { Request, Response } from 'express';

function clsString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  requestId: string;
  timestamp: string;
  path?: string;
}

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

function httpStatusText(status: number): string {
  return STATUS_TEXT[status] ?? 'Error';
}

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const cls = ClsServiceManager.getClsService();
    const requestId: string = clsString(cls?.get('requestId'), 'unknown');
    const method: string = clsString(cls?.get('method'), req.method);
    const path: string = clsString(cls?.get('path'), req.originalUrl);

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const error = isHttp ? httpStatusText(status) : 'Internal Server Error';
    const message: string | string[] = isHttp
      ? exception.message
      : 'An unexpected error occurred';

    const body: ErrorResponseBody = {
      statusCode: status,
      error,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path,
    };

    this.logger.error(
      {
        requestId,
        method,
        path,
        status,
        error: exception instanceof Error ? exception.name : 'UnknownError',
        message:
          typeof message === 'string' ? message : JSON.stringify(message),
        trace: exception instanceof Error ? exception.stack : undefined,
      },
      `HTTP ${status} ${method} ${path}`,
    );

    res.status(status).json(body);
  }
}
