// src/api/interceptors/logging.interceptor.ts

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Interceptor for logging API requests and responses
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('API');

    /**
     * Intercept method to log requests and responses
     * @param context Execution context
     * @param next Call handler
     * @returns Observable of the response
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();
        const method = request.method;
        const url = request.url;
        const now = Date.now();

        // Log the incoming request
        this.logger.log(`${method} ${url} - Started`);

        // Process the request and log the response
        return next.handle().pipe(
            tap(() => {
                const statusCode = response.statusCode;
                const delay = Date.now() - now;
                this.logger.log(`${method} ${url} - ${statusCode} - ${delay}ms`);
            }),
        );
    }
}