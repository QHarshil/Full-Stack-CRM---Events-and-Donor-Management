import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from '../controllers/events.controller';
import { Event } from '../entities/event.entity';
import { EventDonor } from '../entities/event-donor.entity';
import { RolesGuard } from '../guards/roles.guard';
import { AuditTrailModule } from './audit-trail.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventDonor]), AuditTrailModule],
  controllers: [EventsController],
  providers: [RolesGuard],
})
export class EventsModule {}
