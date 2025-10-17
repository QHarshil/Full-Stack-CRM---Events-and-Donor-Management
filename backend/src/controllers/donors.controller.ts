import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Donor } from '../entities/donor.entity';
import { AuthGuard } from '../guards/auth.guard';
import { DonorMatchingService, MatchingCriteria } from '../services/donor-matching.service';

@ApiTags('donors')
@Controller('donors')
@UseGuards(AuthGuard)
export class DonorsController {
  constructor(
    @InjectRepository(Donor)
    private donorRepository: Repository<Donor>,
    private matchingService: DonorMatchingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all donors with optional filters' })
  @ApiResponse({ status: 200, description: 'List of donors' })
  async findAll(
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('interest') interest?: string,
    @Query('sort') sort?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const query = this.donorRepository.createQueryBuilder('donor');

    query.where('donor.deceased = :deceased', { deceased: false });
    query.andWhere('donor.exclude = :exclude', { exclude: false });

    if (search) {
      const normalized = `%${search.toLowerCase()}%`;
      query.andWhere(
        '(LOWER(donor.firstName) LIKE :search OR LOWER(donor.lastName) LIKE :search OR LOWER(donor.email) LIKE :search)',
        { search: normalized },
      );
    }

    if (city) {
      query.andWhere('LOWER(donor.city) LIKE :city', { city: `%${city.toLowerCase()}%` });
    }

    if (interest) {
      const normalizedInterest = interest.toLowerCase();
      query.andWhere("LOWER(',' || donor.interests || ',') LIKE :interest", {
        interest: `%,${normalizedInterest},%`,
      });
    }

    switch (sort) {
      case 'lastGiftDate-desc':
        query.orderBy('donor.lastGiftDate IS NULL', 'ASC');
        query.addOrderBy('donor.lastGiftDate', 'DESC');
        break;
      case 'lastGiftAmount-desc':
        query
          .orderBy('donor.lastGiftAmount', 'DESC')
          .addOrderBy('donor.lastGiftDate IS NULL', 'ASC')
          .addOrderBy('donor.lastGiftDate', 'DESC');
        break;
      case 'alphabetical-asc':
        query
          .orderBy('LOWER(donor.lastName)', 'ASC')
          .addOrderBy('LOWER(donor.firstName)', 'ASC')
          .addOrderBy('donor.id', 'ASC');
        break;
      default:
        query
          .orderBy('donor.totalDonations', 'DESC')
          .addOrderBy('donor.lastGiftDate IS NULL', 'ASC')
          .addOrderBy('donor.lastGiftDate', 'DESC');
    }

    query.skip((page - 1) * limit);
    query.take(limit);

    const [donors, total] = await query.getManyAndCount();

    return {
      donors,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get('filters/options')
  @ApiOperation({ summary: 'Get donor filter options' })
  async getFilterOptions() {
    const donors = await this.donorRepository.find({
      where: { deceased: false, exclude: false },
      select: ['city', 'interests'],
    });

    const citySet = new Set<string>();
    const interestSet = new Set<string>();

    donors.forEach(donor => {
      if (donor.city) {
        citySet.add(donor.city);
      }

      if (Array.isArray(donor.interests)) {
        donor.interests
          .filter(Boolean)
          .map(value => value.trim())
          .forEach(value => interestSet.add(value));
      }
    });

    return {
      cities: Array.from(citySet).sort((a, b) => a.localeCompare(b)),
      interests: Array.from(interestSet).sort((a, b) => a.localeCompare(b)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get donor by ID' })
  @ApiResponse({ status: 200, description: 'Donor details' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.donorRepository.findOne({
      where: { id },
      relations: ['eventDonors', 'eventDonors.event'],
    });
  }

  @Post('match')
  @ApiOperation({ summary: 'Find matching donors using advanced algorithm' })
  @ApiResponse({ status: 200, description: 'Scored and ranked donors' })
  async matchDonors(@Body() criteria: MatchingCriteria) {
    const matches = await this.matchingService.findMatches(criteria);

    return {
      matches: matches.map(m => ({
        donor: m.donor,
        score: Math.round(m.score * 100) / 100,
        breakdown: {
          interest: Math.round(m.breakdown.interestScore),
          location: Math.round(m.breakdown.locationScore),
          donation: Math.round(m.breakdown.donationScore),
          recency: Math.round(m.breakdown.recencyScore),
          engagement: Math.round(m.breakdown.engagementScore),
          capacity: Math.round(m.breakdown.capacityScore),
        },
        matchReasons: m.matchReasons,
      })),
      criteria,
      totalMatches: matches.length,
    };
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get donor statistics summary' })
  async getStats() {
    const total = await this.donorRepository.count({
      where: { deceased: false, exclude: false },
    });

    const result = await this.donorRepository
      .createQueryBuilder('donor')
      .select('SUM(donor.totalDonations)', 'totalDonations')
      .addSelect('AVG(donor.totalDonations)', 'avgDonations')
      .addSelect('MAX(donor.totalDonations)', 'maxDonation')
      .where('donor.deceased = :deceased', { deceased: false })
      .andWhere('donor.exclude = :exclude', { exclude: false })
      .getRawOne();

    return {
      totalDonors: total,
      totalDonations: parseFloat(result.totalDonations) || 0,
      averageDonation: parseFloat(result.avgDonations) || 0,
      largestDonation: parseFloat(result.maxDonation) || 0,
    };
  }
}
