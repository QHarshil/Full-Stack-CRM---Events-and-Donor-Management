import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from '../controllers/analytics.controller';
import { AnalyticsService } from '../services/analytics.service';
import { Donor } from '../entities/donor.entity';
import { Event } from '../entities/event.entity';
import { EventDonor } from '../entities/event-donor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Donor, Event, EventDonor])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}

