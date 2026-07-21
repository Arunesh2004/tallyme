import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const configureOpenAPI = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('TallyMe Enterprise API')
    .setDescription(
      'The core API documentation for TallyMe operations and automation.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth')
    .addTag('Vendor Automation')
    .addTag('Student Automation')
    .addTag('ERP Synchronization')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  return document;
};
