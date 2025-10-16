import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AuditAction, AuditLog } from '../entities/audit-log.entity';

export interface AuditTrailPayload {
  action: AuditAction;
  entityType: string;
  entityId?: number;
  userId?: number;
  ipAddress?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

export interface AuditLogListOptions {
  page?: number;
  limit?: number;
  action?: AuditAction;
  entityType?: string;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface AuditLogView {
  id: number;
  action: AuditAction;
  entityType: string;
  entityId: number | null;
  userId: number | null;
  ipAddress: string | null;
  createdAt: Date;
  changes: Record<string, any> | null;
}

export interface AuditLogListResult {
  items: AuditLogView[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export type AuditExportFormat = 'csv' | 'json';

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);
  private readonly sensitiveFields = new Set(['password', 'token', 'secret', 'salt', 'apiKey', 'apikey']);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(payload: AuditTrailPayload): Promise<void> {
    try {
      const entry = this.auditRepository.create({
        userId: payload.userId ?? null,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId ?? null,
        changes: this.buildChanges(payload),
        ipAddress: payload.ipAddress ?? null,
      });

      await this.auditRepository.save(entry);
    } catch (error) {
      const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      this.logger.error(`Failed to persist audit trail entry: ${details}`, error instanceof Error ? error.stack : undefined);
    }
  }

  async list(options: AuditLogListOptions = {}): Promise<AuditLogListResult> {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 && options.limit <= 200 ? options.limit : 25;

    const where = this.buildWhereClause(options);

    const [records, total] = await this.auditRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: records.map(record => this.mapToView(record)),
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<AuditLogView | null> {
    const record = await this.auditRepository.findOne({ where: { id } });
    if (!record) {
      return null;
    }
    return this.mapToView(record);
  }

  async export(options: AuditLogListOptions = {}): Promise<AuditLogView[]> {
    const where = this.buildWhereClause(options);
    const records = await this.auditRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return records.map(record => this.mapToView(record));
  }

  private mapToView(record: AuditLog): AuditLogView {
    return {
      id: record.id,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId ?? null,
      userId: record.userId ?? null,
      ipAddress: record.ipAddress ?? null,
      createdAt: record.createdAt,
      changes: this.parseChanges(record.changes),
    };
  }

  private buildChanges(payload: AuditTrailPayload): string | null {
    const { before, after, metadata } = payload;
    const sanitizedBefore = before ? this.deepSanitize(before) : null;
    const sanitizedAfter = after ? this.deepSanitize(after) : null;
    const body: Record<string, any> = {};

    if (sanitizedBefore) {
      body.before = sanitizedBefore;
    }

    if (sanitizedAfter) {
      body.after = sanitizedAfter;
    }

    if (sanitizedBefore && sanitizedAfter) {
      const diff = this.computeDiff(sanitizedBefore, sanitizedAfter);
      if (Object.keys(diff).length > 0) {
        body.diff = diff;
      }
    }

    if (metadata && Object.keys(metadata).length > 0) {
      body.metadata = this.deepSanitize(metadata);
    }

    return Object.keys(body).length > 0 ? JSON.stringify(body) : null;
  }

  private computeDiff(
    before: Record<string, any>,
    after: Record<string, any>,
  ): Record<string, { before: any; after: any }> {
    const diff: Record<string, { before: any; after: any }> = {};
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of keys) {
      if (this.isEqual(before[key], after[key])) {
        continue;
      }

      diff[key] = {
        before: before[key] ?? null,
        after: after[key] ?? null,
      };
    }

    return diff;
  }

  private buildWhereClause(options: AuditLogListOptions): FindOptionsWhere<AuditLog> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (options.action) {
      where.action = options.action;
    }

    if (options.entityType) {
      where.entityType = options.entityType;
    }

    if (typeof options.userId === 'number' && !Number.isNaN(options.userId)) {
      where.userId = options.userId;
    }

    if (options.startDate || options.endDate) {
      if (options.startDate && options.endDate) {
        where.createdAt = Between(options.startDate, options.endDate);
      } else if (options.startDate) {
        where.createdAt = MoreThanOrEqual(options.startDate);
      } else if (options.endDate) {
        where.createdAt = LessThanOrEqual(options.endDate);
      }
    }

    return where;
  }

  private isEqual(a: any, b: any): boolean {
    if (a === b) {
      return true;
    }

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    if (typeof a !== typeof b) {
      return false;
    }

    if (a && b && typeof a === 'object') {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);

      if (aKeys.length !== bKeys.length) {
        return false;
      }

      return aKeys.every(key => this.isEqual(a[key], b[key]));
    }

    return false;
  }

  private deepSanitize(value: any): any {
    if (Array.isArray(value)) {
      return value.map(item => this.deepSanitize(item));
    }

    if (value && typeof value === 'object') {
      return Object.entries(value).reduce<Record<string, any>>((acc, [key, val]) => {
        const normalizedKey = key.toLowerCase();
        if (this.sensitiveFields.has(normalizedKey)) {
          acc[key] = '[REDACTED]';
          return acc;
        }

        acc[key] = this.deepSanitize(val);
        return acc;
      }, {});
    }

    return value;
  }

  private parseChanges(changes: string | null): Record<string, any> | null {
    if (!changes) {
      return null;
    }

    try {
      return JSON.parse(changes);
    } catch (error) {
      const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      this.logger.warn(`Unable to parse audit log changes payload: ${details}`);
      return null;
    }
  }
}
