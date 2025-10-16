import {
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuditTrailService, AuditLogListResult } from '../services/audit-trail.service';
import { AuditAction } from '../entities/audit-log.entity';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('audit-logs')
@Controller('admin/audit-logs')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogsController {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  @Get()
  @ApiOperation({ summary: 'List audit log entries (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 200)' })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction, description: 'Filter by action type' })
  @ApiQuery({ name: 'entityType', required: false, type: String, description: 'Filter by entity type' })
  @ApiQuery({ name: 'userId', required: false, type: Number, description: 'Filter by actor user id' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter by createdAt lower bound (ISO timestamp)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter by createdAt upper bound (ISO timestamp)',
  })
  @ApiResponse({ status: 200, description: 'Paginated audit log entries' })
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AuditLogListResult> {
    const parsedAction = this.parseAction(action);
    const parsedUserId = this.parseUserId(userId);

    const parsedStartDate = this.parseDate(startDate);
    const parsedEndDate = this.parseDate(endDate);

    return this.auditTrailService.list({
      page,
      limit,
      action: parsedAction,
      entityType: entityType?.trim() || undefined,
      userId: parsedUserId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details for a single audit log entry (admin only)' })
  @ApiResponse({ status: 200, description: 'Audit log entry detail' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    const log = await this.auditTrailService.findOne(id);
    if (!log) {
      throw new NotFoundException('Audit log not found');
    }
    return log;
  }

  @Get('export')
  @ApiOperation({ summary: 'Export audit logs (admin only)' })
  @ApiQuery({ name: 'format', required: false, type: String, description: 'Export format (csv|json)' })
  @ApiResponse({ status: 200, description: 'Exported audit log data' })
  async export(
    @Query('format') format = 'csv',
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const parsedAction = this.parseAction(action);
    const parsedUserId = this.parseUserId(userId);
    const parsedStartDate = this.parseDate(startDate);
    const parsedEndDate = this.parseDate(endDate);

    const items = await this.auditTrailService.export({
      action: parsedAction,
      entityType: entityType?.trim() || undefined,
      userId: parsedUserId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    });

    const timestamp = new Date().toISOString().replace(/[:]/g, '-');

    if (format === 'json') {
      if (res) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${timestamp}.json"`);
      }
      return items;
    }

    const csv = this.toCsv(items);
    if (res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${timestamp}.csv"`);
    }
    return csv;
  }

  private parseAction(value?: string): AuditAction | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = value.toLowerCase();
    return Object.values(AuditAction).find(action => action === normalized) as AuditAction | undefined;
  }

  private parseUserId(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private toCsv(items: Awaited<ReturnType<AuditTrailService['export']>>) {
    const header = ['id', 'action', 'entityType', 'entityId', 'userId', 'ipAddress', 'createdAt', 'changes'];
    const rows = items.map(item => [
      item.id,
      item.action,
      item.entityType,
      item.entityId ?? '',
      item.userId ?? '',
      item.ipAddress ?? '',
      item.createdAt.toISOString(),
      item.changes ? JSON.stringify(item.changes) : '',
    ]);

    return [header, ...rows]
      .map(columns =>
        columns
          .map(value => {
            if (value === null || value === undefined) {
              return '';
            }
            const stringValue = String(value);
            if (/[",\r\n]/.test(stringValue)) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(','),
      )
      .join('\r\n');
  }
}
