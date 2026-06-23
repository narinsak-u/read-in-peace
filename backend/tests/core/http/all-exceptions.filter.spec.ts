import { AllExceptionsFilter } from '../../../src/core/http/all-exceptions.filter';
import type { PinoLogger } from 'nestjs-pino';
import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';

interface MockLogCall {
  message: string;
  obj: Record<string, unknown>;
}

const createMockLogger = () => {
  const calls: MockLogCall[] = [];
  const error = jest.fn((obj: Record<string, unknown>, msg: string) => {
    calls.push({ obj, message: msg });
  });
  return { error, calls } as unknown as PinoLogger & { calls: MockLogCall[] };
};

describe('AllExceptionsFilter', () => {
  // minimal mock since nestjs-cls is not installed in test
  jest.mock('nestjs-cls', () => ({
    ClsServiceManager: { getClsService: () => undefined },
  }));

  it('serializes HttpException into the canonical error envelope', () => {
    const logger = createMockLogger();
    const filter = new AllExceptionsFilter(logger);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', originalUrl: '/books/x' }),
        getResponse: () => res,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new NotFoundException('book missing'), host);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'Not Found',
        message: expect.stringContaining('book missing'),
        requestId: 'unknown',
        timestamp: expect.any(String),
        path: '/books/x',
      }),
    );
    expect(logger.calls).toHaveLength(1);
    expect(logger.calls[0]).toMatchObject({
      message: expect.stringContaining('HTTP 404'),
      obj: expect.objectContaining({ status: 404 }),
    });
  });

  it('returns 500 for unknown errors', () => {
    const logger = createMockLogger();
    const filter = new AllExceptionsFilter(logger);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', originalUrl: '/x' }),
        getResponse: () => res,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new Error('boom'), host);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'Internal Server Error',
      }),
    );
  });
});
