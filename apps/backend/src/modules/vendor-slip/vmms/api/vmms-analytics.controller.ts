import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { VmmsComparisonService } from '../application/vmms-comparison.service';
import {
  GetMismatchesQueryDto,
  GetSummaryQueryDto,
} from './dto/vmms-analytics.dto';

@Controller('vmms/analytics')
export class VmmsAnalyticsController {
  constructor(private readonly comparisonService: VmmsComparisonService) {}

  @Get('summary')
  @UsePipes(new ValidationPipe({ transform: true }))
  public async getSummary(@Query() query: GetSummaryQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    return await this.comparisonService.getSummary(
      query.companyId,
      startDate,
      endDate,
    );
  }

  @Get('mismatches')
  @UsePipes(new ValidationPipe({ transform: true }))
  public async getMismatches(@Query() query: GetMismatchesQueryDto) {
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const result = await this.comparisonService.getMismatchesPaginated(
      query.limit,
      query.cursor,
      query.companyId,
      startDate,
      endDate,
    );

    return {
      data: result.data,
      meta: {
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
        limit: query.limit,
      },
    };
  }
}
