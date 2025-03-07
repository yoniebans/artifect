// src/api/filters/http-exception.filter.ts

import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP exception filter for consistent error responses
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('ExceptionFilter');

    /**
     * Catch and format HTTP exceptions
     * @param exception The caught exception
     * @param host Arguments host
     */
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();

        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: exception.message || null,
            error: exception.name,
        };

        // Log all client errors (4xx) and server errors (5xx)
        if (status >= HttpStatus.BAD_REQUEST) {
            this.logger.error(
                `${request.method} ${request.url} - ${status} - ${exception.message}`,
                exception.stack,
            );
        }

        response.status(status).json(errorResponse);
    }
}