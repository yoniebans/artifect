// src/api/filters/http-exception.filter.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
    let filter: HttpExceptionFilter;

    // Mock response object
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockResponse = { status: mockStatus, statusCode: HttpStatus.BAD_REQUEST };

    // Mock request object
    const mockRequest = { url: '/test', method: 'GET' };

    // Mock host
    const mockHost = {
        switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
            getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
    };

    beforeEach(async () => {
        jest.spyOn(Logger.prototype, 'error').mockImplementation();

        filter = new HttpExceptionFilter();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(filter).toBeDefined();
    });

    describe('catch', () => {
        it('should format the exception response', () => {
            const exception = new HttpException('Test error message', HttpStatus.BAD_REQUEST);

            filter.catch(exception, mockHost as any);

            expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(mockJson).toHaveBeenCalledWith({
                statusCode: HttpStatus.BAD_REQUEST,
                timestamp: expect.any(String),
                path: '/test',
                method: 'GET',
                message: 'Test error message',
                error: 'HttpException',
            });
        });

        it('should log 4xx client errors', () => {
            const exception = new HttpException('Client error', HttpStatus.BAD_REQUEST);

            filter.catch(exception, mockHost as any);

            expect(Logger.prototype.error).toHaveBeenCalled();
        });

        it('should log 5xx server errors', () => {
            const exception = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);
            mockResponse.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

            filter.catch(exception, mockHost as any);

            expect(Logger.prototype.error).toHaveBeenCalled();
        });
    });
});