import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { AuditTrailService } from './audit-trail.service';
import { AuditAction } from '../entities/audit-log.entity';
import { userAuditSnapshot } from '../utils/audit-snapshots.util';

interface UpdateUserRolePayload {
  role: UserRole;
}

interface UpdateUserStatusPayload {
  isActive: boolean;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  async getAllUsers() {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });

    return users.map(({ password, ...rest }) => rest);
  }

  async updateUserRole(
    actor: User | undefined,
    userId: number,
    payload: UpdateUserRolePayload,
    ipAddress?: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const before = userAuditSnapshot(user);

    user.role = payload.role;
    await this.userRepository.save(user);

    await this.auditTrailService.log({
      action: AuditAction.UPDATE,
      entityType: 'user',
      entityId: user.id,
      userId: actor?.id,
      ipAddress: ipAddress ?? null,
      before,
      after: userAuditSnapshot(user),
      metadata: {
        reason: 'Role updated',
        actor: actor ? { id: actor.id, username: actor.username, role: actor.role } : undefined,
      },
    });

    const { password, ...rest } = user;
    return rest;
  }

  async updateUserStatus(
    actor: User | undefined,
    userId: number,
    payload: UpdateUserStatusPayload,
    ipAddress?: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN && payload.isActive === false) {
      const otherActiveAdmins = await this.userRepository.count({
        where: { role: UserRole.ADMIN, isActive: true, id: Not(user.id) },
      });

      if (otherActiveAdmins === 0) {
        throw new BadRequestException('At least one active admin user must remain in the system');
      }
    }

    const before = userAuditSnapshot(user);

    user.isActive = payload.isActive;
    await this.userRepository.save(user);

    await this.auditTrailService.log({
      action: AuditAction.UPDATE,
      entityType: 'user',
      entityId: user.id,
      userId: actor?.id,
      ipAddress: ipAddress ?? null,
      before,
      after: userAuditSnapshot(user),
      metadata: {
        reason: 'Account status updated',
        actor: actor ? { id: actor.id, username: actor.username, role: actor.role } : undefined,
      },
    });

    const { password, ...rest } = user;
    return rest;
  }
}
