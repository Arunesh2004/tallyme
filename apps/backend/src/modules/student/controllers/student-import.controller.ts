import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import * as csv from 'csv-parse';

@Controller('api/students')
export class StudentImportController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importStudents(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
    }

    const records: any[] = [];
    const parser = csv.parse(file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    for await (const record of parser) {
      // Required fields based on prompt
      const {
        'Admission Number': admissionNumber,
        'Student Name': name,
        Email: email,
        Phone: phone,
        Class: studentClass,
        Section: section,
        'Academic Year': academicYear,
      } = record;

      if (!admissionNumber || !name) {
        continue; // Skip invalid rows
      }

      records.push({
        enrollmentNo: admissionNumber, // Use admissionNumber as enrollmentNo for simplicity if needed
        admissionNumber,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || '',
        email: email || null,
        phone: phone || null,
        class: studentClass || null,
        section: section || null,
        academicYear: academicYear || null,
        status: 'ACTIVE',
      });
    }

    let successCount = 0;
    let duplicateCount = 0;

    for (const data of records) {
      try {
        await this.prisma.student.upsert({
          where: { admissionNumber: data.admissionNumber },
          update: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            class: data.class,
            section: data.section,
            academicYear: data.academicYear,
          },
          create: data,
        });
        successCount++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          duplicateCount++;
        } else {
          console.error(err);
        }
      }
    }

    return {
      message: 'Import completed',
      totalRowsProcessed: records.length,
      successCount,
      duplicateCount,
    };
  }
}
