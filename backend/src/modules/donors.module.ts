import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonorsController } from '../controllers/donors.controller';
import { Donor } from '../entities/donor.entity';
import { DonorMatchingService } from '../services/donor-matching.service';

@Module({
  imports: [TypeOrmModule.forFeature([Donor])],
  controllers: [DonorsController],
  providers: [DonorMatchingService],
  exports: [DonorMatchingService],
})
export class DonorsModule {}

