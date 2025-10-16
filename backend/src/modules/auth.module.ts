import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from '../controllers/auth.controller';
import { User } from '../entities/user.entity';
import { RolesGuard } from '../guards/roles.guard';
import { AuditTrailModule } from './audit-trail.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuditTrailModule],
  controllers: [AuthController],
  providers: [RolesGuard],
})
export class AuthModule {}
