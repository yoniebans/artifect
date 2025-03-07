// src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './api/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Apply global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Set up Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('AI-Assisted Software Engineering Platform')
    .setDescription('API for the AI-Assisted Software Engineering Platform')
    .setVersion('1.0')
    .addTag('projects', 'Project management')
    .addTag('artifacts', 'Artifact management')
    .addTag('ai', 'AI provider operations')
    .addApiKey({ type: 'apiKey', name: 'X-AI-Provider', in: 'header' }, 'ai-provider')
    .addApiKey({ type: 'apiKey', name: 'X-AI-Model', in: 'header' }, 'ai-model')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Start the server
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`API documentation available at: http://localhost:${port}/api`);
}

bootstrap();