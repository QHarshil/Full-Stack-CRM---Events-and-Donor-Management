import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('BC Cancer CRM API')
    .setDescription('Donor Management System for BC Cancer Foundation')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('donors', 'Donor management')
    .addTag('events', 'Event management')
    .addTag('analytics', 'Analytics and reporting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  BC Cancer Foundation - Donor Management CRM');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  🚀 Server running on: http://localhost:${port}`);
  console.log(`  📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log('');
  console.log('  Demo Credentials:');
  console.log('    Admin:   admin / password123');
  console.log('    Manager: manager / password123');
  console.log('    Staff:   staff / password123');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
}

bootstrap();
