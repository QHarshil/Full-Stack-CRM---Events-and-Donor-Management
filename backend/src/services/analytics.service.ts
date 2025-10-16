import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donor } from '../entities/donor.entity';
import { Event } from '../entities/event.entity';
import { EventDonor } from '../entities/event-donor.entity';

export interface AnalyticsSummary {
  totalDonors: number;
  activeDonors: number;
  totalDonations: number;
  averageDonation: number;
  totalEvents: number;
  upcomingEvents: number;
  donorSegments: DonorSegment[];
  topCities: CityDistribution[];
  topInterests: InterestDistribution[];
  engagementRate: number;
  topDonors: TopDonorSummary[];
}

export interface DonorSegment {
  segment: string;
  count: number;
  totalDonations: number;
  averageDonation: number;
}

export interface CityDistribution {
  city: string;
  count: number;
  totalDonations: number;
}

export interface InterestDistribution {
  interest: string;
  count: number;
}

export interface TopDonorSummary {
  id: number;
  firstName: string;
  lastName: string;
  totalDonations: number;
  largestGift: number;
  city: string;
  province: string;
}

/**
 * Analytics Service
 * Provides comprehensive analytics and insights for the CRM dashboard
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Donor)
    private donorRepository: Repository<Donor>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventDonor)
    private eventDonorRepository: Repository<EventDonor>,
  ) {}

  async getSummary(): Promise<AnalyticsSummary> {
    const [
      totalDonors,
      activeDonors,
      totalDonations,
      totalEvents,
      upcomingEvents,
      donorSegments,
      topCities,
      topInterests,
      engagementRate,
      topDonors,
    ] = await Promise.all([
      this.getTotalDonors(),
      this.getActiveDonors(),
      this.getTotalDonations(),
      this.getTotalEvents(),
      this.getUpcomingEvents(),
      this.getDonorSegments(),
      this.getTopCities(),
      this.getTopInterests(),
      this.getEngagementRate(),
      this.getTopDonors(),
    ]);

    const averageDonation = totalDonors > 0 ? totalDonations / totalDonors : 0;

    return {
      totalDonors,
      activeDonors,
      totalDonations,
      averageDonation,
      totalEvents,
      upcomingEvents,
      donorSegments,
      topCities,
      topInterests,
      engagementRate,
      topDonors,
    };
  }

  private async getTotalDonors(): Promise<number> {
    return this.donorRepository.count({
      where: { deceased: false, exclude: false },
    });
  }

  private async getActiveDonors(): Promise<number> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await this.donorRepository
      .createQueryBuilder('donor')
      .where('donor.deceased = :deceased', { deceased: false })
      .andWhere('donor.exclude = :exclude', { exclude: false })
      .andWhere('donor.lastGiftDate >= :oneYearAgo', { oneYearAgo })
      .getCount();

    return result;
  }

  private async getTotalDonations(): Promise<number> {
    const result = await this.donorRepository
      .createQueryBuilder('donor')
      .select('SUM(donor.totalDonations)', 'total')
      .where('donor.deceased = :deceased', { deceased: false })
      .andWhere('donor.exclude = :exclude', { exclude: false })
      .getRawOne();

    return result?.total || 0;
  }

  private async getTotalEvents(): Promise<number> {
    return this.eventRepository.count();
  }

  private async getUpcomingEvents(): Promise<number> {
    const now = new Date();
    return this.eventRepository
      .createQueryBuilder('event')
      .where('event.date >= :now', { now })
      .getCount();
  }

  private async getDonorSegments(): Promise<DonorSegment[]> {
    const donors = await this.donorRepository.find({
      where: { deceased: false, exclude: false },
    });

    const segments = {
      major: { min: 50000, donors: [] as Donor[] },
      mid: { min: 10000, max: 49999, donors: [] as Donor[] },
      regular: { min: 1000, max: 9999, donors: [] as Donor[] },
      small: { min: 0, max: 999, donors: [] as Donor[] },
    };

    donors.forEach(donor => {
      const total = donor.totalDonations || 0;
      if (total >= 50000) segments.major.donors.push(donor);
      else if (total >= 10000) segments.mid.donors.push(donor);
      else if (total >= 1000) segments.regular.donors.push(donor);
      else segments.small.donors.push(donor);
    });

    return Object.entries(segments).map(([key, value]) => ({
      segment: key,
      count: value.donors.length,
      totalDonations: value.donors.reduce((sum, d) => sum + (d.totalDonations || 0), 0),
      averageDonation:
        value.donors.length > 0
          ? value.donors.reduce((sum, d) => sum + (d.totalDonations || 0), 0) / value.donors.length
          : 0,
    }));
  }

  private async getTopCities(limit: number = 10): Promise<CityDistribution[]> {
    const result = await this.donorRepository
      .createQueryBuilder('donor')
      .select('donor.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(donor.totalDonations)', 'totalDonations')
      .where('donor.deceased = :deceased', { deceased: false })
      .andWhere('donor.exclude = :exclude', { exclude: false })
      .andWhere('donor.city IS NOT NULL')
      .groupBy('donor.city')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return result.map(r => ({
      city: r.city,
      count: parseInt(r.count),
      totalDonations: parseFloat(r.totalDonations) || 0,
    }));
  }

  private async getTopInterests(limit: number = 10): Promise<InterestDistribution[]> {
    const donors = await this.donorRepository.find({
      where: { deceased: false, exclude: false },
    });

    const interestCounts = new Map<string, number>();

    donors.forEach(donor => {
      if (donor.interests && Array.isArray(donor.interests)) {
        donor.interests.forEach(interest => {
          interestCounts.set(interest, (interestCounts.get(interest) || 0) + 1);
        });
      }
    });

    return Array.from(interestCounts.entries())
      .map(([interest, count]) => ({ interest, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private async getEngagementRate(): Promise<number> {
    const total = await this.getTotalDonors();
    if (total === 0) return 0;

    const engaged = await this.donorRepository
      .createQueryBuilder('donor')
      .where('donor.deceased = :deceased', { deceased: false })
      .andWhere('donor.exclude = :exclude', { exclude: false })
      .andWhere(
        '(donor.subscriptionEventsInPerson = :true OR donor.subscriptionNewsletter = :true)',
        { true: true },
      )
      .getCount();

    return (engaged / total) * 100;
  }

  private async getTopDonors(limit: number = 10): Promise<TopDonorSummary[]> {
    const donors = await this.donorRepository.find({
      where: { deceased: false, exclude: false },
      order: { totalDonations: 'DESC' },
      take: limit,
    });

    return donors.map(donor => ({
      id: donor.id,
      firstName: donor.firstName,
      lastName: donor.lastName,
      totalDonations: donor.totalDonations || 0,
      largestGift: donor.largestGift || 0,
      city: donor.city,
      province: donor.province,
    }));
  }
}
