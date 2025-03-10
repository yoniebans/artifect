// Import reflect-metadata to support decorators
import 'reflect-metadata';

// Mock the Swagger module
jest.mock('@nestjs/swagger', () => {
    const createMockDecorator = () => () => jest.fn();
    return {
        ApiOperation: createMockDecorator(),
        ApiResponse: createMockDecorator(),
        ApiBody: createMockDecorator(),
        ApiParam: createMockDecorator(),
        ApiHeader: createMockDecorator(),
        ApiTags: createMockDecorator(),
        ApiOkResponse: createMockDecorator(),
        ApiCreatedResponse: createMockDecorator(),
        ApiNotFoundResponse: createMockDecorator(),
        ApiBadRequestResponse: createMockDecorator(),
        ApiProduces: createMockDecorator(),
        DocumentBuilder: jest.fn().mockImplementation(() => ({
            setTitle: () => ({
                setDescription: () => ({
                    setVersion: () => ({
                        addTag: () => ({
                            addApiKey: () => ({ build: () => ({}) })
                        })
                    })
                })
            })
        })),
        SwaggerModule: {
            createDocument: jest.fn(),
            setup: jest.fn()
        }
    };
});