import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and message
    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      // Handle HTTP exceptions (BadRequestException, UnauthorizedException, etc.)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      } else {
        message = exception.message;
        error = exception.name;
      }
    } else if (exception instanceof Error) {
      // Handle general errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
      
      // Log the actual error for debugging
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
        'GlobalExceptionFilter',
      );
    } else {
      // Handle unknown exceptions
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
      
      this.logger.error(
        `Unknown exception: ${JSON.stringify(exception)}`,
        undefined,
        'GlobalExceptionFilter',
      );
    }

    // Create consistent error response
    const errorResponse = {
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Add stack trace in development
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv === 'development' && exception instanceof Error) {
      (errorResponse as any).stack = exception.stack;
    }

    // Log error details for monitoring
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        userId: (request as any).user?.userId,
        companyId: (request as any).user?.companyId,
      },
    );

    response.status(status).json(errorResponse);
  }
}