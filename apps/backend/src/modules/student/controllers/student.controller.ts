import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreateStudentUseCase,
  UpdateStudentUseCase,
  GetStudentUseCase,
  SearchStudentsUseCase,
  ArchiveStudentUseCase,
} from '../use-cases';
import {
  CreateStudentDto,
  UpdateStudentDto,
  SearchStudentDto,
} from '../dto/student.dto';
import { StudentResponseMapper } from '../mappers/student.mapper';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../auth/authorization/decorators/permissions.decorator';
import { PermissionGuard } from '../../auth/authorization/guards/permission.guard';

@Controller('students')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class StudentController {
  constructor(
    private readonly createStudent: CreateStudentUseCase,
    private readonly updateStudent: UpdateStudentUseCase,
    private readonly getStudent: GetStudentUseCase,
    private readonly searchStudents: SearchStudentsUseCase,
    private readonly archiveStudent: ArchiveStudentUseCase,
  ) {}

  @Post()
  @Permissions('student:create')
  async create(@Body() dto: CreateStudentDto) {
    const student = await this.createStudent.execute(dto);
    return StudentResponseMapper.toResponse(student);
  }

  @Get()
  @Permissions('student:read')
  async search(@Query() filters: SearchStudentDto) {
    const result = await this.searchStudents.execute(filters);
    return {
      ...result,
      data: result.data.map(StudentResponseMapper.toResponse),
    };
  }

  @Get(':id')
  @Permissions('student:read')
  async get(@Param('id') id: string) {
    const student = await this.getStudent.execute(id);
    return StudentResponseMapper.toResponse(student);
  }

  @Put(':id')
  @Permissions('student:update')
  async update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    const student = await this.updateStudent.execute(id, dto);
    return StudentResponseMapper.toResponse(student);
  }

  @Delete(':id')
  @Permissions('student:delete')
  async archive(@Param('id') id: string) {
    await this.archiveStudent.execute(id);
    return { success: true, message: 'Student archived successfully' };
  }
}
