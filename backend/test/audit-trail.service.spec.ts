import { AuditAction } from '../src/entities/audit-log.entity';
import { AuditTrailService } from '../src/services/audit-trail.service';

describe('AuditTrailService', () => {
  const mockRecord = {
    id: 1,
    action: AuditAction.UPDATE,
    entityType: 'user',
    entityId: 42,
    userId: 7,
    ipAddress: '127.0.0.1',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    changes: JSON.stringify({ diff: { role: { before: 'staff', after: 'admin' } } }),
  };

  const createService = () => {
    const repository = {
      create: jest.fn().mockImplementation(data => data),
      save: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[mockRecord], 1]),
      find: jest.fn().mockResolvedValue([mockRecord]),
    };

    const service = new AuditTrailService(repository as any);
    return { service, repository };
  };

  it('filters audit logs by action and pagination', async () => {
    const { service, repository } = createService();

    const result = await service.list({
      action: AuditAction.UPDATE,
      page: 2,
      limit: 10,
    });

    expect(repository.findAndCount).toHaveBeenCalledWith({
      where: {
        action: AuditAction.UPDATE,
      },
      order: { createdAt: 'DESC' },
      skip: 10,
      take: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].action).toBe(AuditAction.UPDATE);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });

  it('exports audit logs as mapped view records', async () => {
    const { service, repository } = createService();

    const result = await service.export({
      entityType: 'user',
    });

    expect(repository.find).toHaveBeenCalledWith({
      where: {
        entityType: 'user',
      },
      order: { createdAt: 'DESC' },
    });
    expect(result).toEqual([
      {
        id: 1,
        action: AuditAction.UPDATE,
        entityType: 'user',
        entityId: 42,
        userId: 7,
        ipAddress: '127.0.0.1',
        createdAt: expect.any(Date),
        changes: { diff: { role: { before: 'staff', after: 'admin' } } },
      },
    ]);
  });

  it('redacts sensitive fields when building changes', async () => {
    const { service, repository } = createService();
    await service.log({
      action: AuditAction.UPDATE,
      entityType: 'user',
      userId: 1,
      before: { password: 'secret' },
      after: { password: 'new-secret' },
    });

    expect(repository.save).toHaveBeenCalledTimes(1);
    const savedPayload = repository.save.mock.calls[0][0];
    const parsedChanges = savedPayload && savedPayload.changes ? JSON.parse(savedPayload.changes) : {};

    expect(parsedChanges.before.password).toBe('[REDACTED]');
    expect(parsedChanges.after.password).toBe('[REDACTED]');
    expect(JSON.stringify(parsedChanges)).not.toContain('secret');
  });
});
