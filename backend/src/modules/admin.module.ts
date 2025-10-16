import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from '../controllers/admin.controller';
import { AuditLogsController } from '../controllers/audit-logs.controller';
import { AdminService } from '../services/admin.service';
import { User } from '../entities/user.entity';
import { RolesGuard } from '../guards/roles.guard';
import { AuditTrailModule } from './audit-trail.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuditTrailModule],
  controllers: [AdminController, AuditLogsController],
  providers: [AdminService, RolesGuard],
})
export class AdminModule {}
