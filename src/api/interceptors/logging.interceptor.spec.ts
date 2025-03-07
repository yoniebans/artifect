// src/api/interceptors/logging.interceptor.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

describe('LoggingInterceptor', () => {
    let interceptor: LoggingInterceptor;

    // Mock execution context
    const mockRequest = { method: 'GET', url: '/test' };
    const mockResponse = { statusCode: 200 };
    const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue(mockRequest),
            getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
    };

    // Mock call handler
    const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'test' })),
    };

    beforeEach(async () => {
        jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Date, 'now')
            .mockReturnValueOnce(1000) // First call - start time
            .mockReturnValueOnce(1500); // Second call - end time (500ms difference)

        interceptor = new LoggingInterceptor();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    describe('intercept', () => {
        it('should log request and response with timing', (done) => {
            interceptor.intercept(mockContext as unknown as ExecutionContext, mockCallHandler as CallHandler)
                .subscribe({
                    next: () => {
                        expect(Logger.prototype.log).toHaveBeenCalledTimes(2);
                        expect(Logger.prototype.log).toHaveBeenNthCalledWith(1, 'GET /test - Started');
                        expect(Logger.prototype.log).toHaveBeenNthCalledWith(2, 'GET /test - 200 - 500ms');
                        done();
                    },
                });
        });

        it('should not interfere with the response data', (done) => {
            interceptor.intercept(mockContext as unknown as ExecutionContext, mockCallHandler as CallHandler)
                .subscribe({
                    next: (data) => {
                        expect(data).toEqual({ data: 'test' });
                        done();
                    },
                });
        });
    });
});