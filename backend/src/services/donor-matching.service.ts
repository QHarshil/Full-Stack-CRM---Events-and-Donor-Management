import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donor } from '../entities/donor.entity';

export interface MatchingCriteria {
  eventType: string[];
  location?: string;
  minTotalDonations?: number;
  targetAttendees?: number;
  eventFocus?: 'fundraising' | 'attendees' | 'engagement';
}

export interface MatchingWeights {
  interestMatch: number;
  locationMatch: number;
  donationHistory: number;
  recency: number;
  engagement: number;
  capacity: number;
}

export interface ScoredDonor {
  donor: Donor;
  score: number;
  breakdown: {
    interestScore: number;
    locationScore: number;
    donationScore: number;
    recencyScore: number;
    engagementScore: number;
    capacityScore: number;
  };
  matchReasons: string[];
}

/**
 * Advanced Donor Matching Service
 * 
 * Implements a sophisticated multi-criteria scoring algorithm for matching donors to events.
 * Uses weighted scoring across six dimensions:
 * 1. Interest Alignment - How well donor interests match event type
 * 2. Geographic Proximity - Distance/location matching
 * 3. Donation History - Past giving patterns and amounts
 * 4. Recency - How recently they've donated
 * 5. Engagement Level - Event subscriptions and communication preferences
 * 6. Giving Capacity - Estimated ability to give
 * 
 * The algorithm is configurable with different weight profiles for different event types
 * (fundraising-focused vs. attendance-focused vs. engagement-focused).
 */
@Injectable()
export class DonorMatchingService {
  constructor(
    @InjectRepository(Donor)
    private donorRepository: Repository<Donor>,
  ) {}

  /**
   * Get default weights based on event focus
   */
  private getDefaultWeights(eventFocus: string): MatchingWeights {
    const profiles: Record<string, MatchingWeights> = {
      fundraising: {
        interestMatch: 0.25,
        locationMatch: 0.15,
        donationHistory: 0.30,
        recency: 0.10,
        engagement: 0.10,
        capacity: 0.10,
      },
      attendees: {
        interestMatch: 0.30,
        locationMatch: 0.25,
        donationHistory: 0.10,
        recency: 0.15,
        engagement: 0.15,
        capacity: 0.05,
      },
      engagement: {
        interestMatch: 0.20,
        locationMatch: 0.15,
        donationHistory: 0.15,
        recency: 0.20,
        engagement: 0.25,
        capacity: 0.05,
      },
    };

    return profiles[eventFocus] || profiles.fundraising;
  }

  /**
   * Calculate interest match score (0-100)
   * Uses fuzzy matching to find overlaps between donor interests and event types
   */
  private calculateInterestScore(donor: Donor, eventTypes: string[]): number {
    if (!donor.interests || donor.interests.length === 0) return 0;

    const matches = eventTypes.filter(type =>
      donor.interests.some(interest =>
        interest.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(interest.toLowerCase())
      )
    );

    const matchRatio = matches.length / eventTypes.length;
    const interestDepth = donor.interests.filter(interest =>
      eventTypes.some(type =>
        interest.toLowerCase().includes(type.toLowerCase())
      )
    ).length;

    return Math.min(100, matchRatio * 70 + interestDepth * 10);
  }

  /**
   * Calculate location match score (0-100)
   */
  private calculateLocationScore(donor: Donor, location?: string): number {
    if (!location) return 50;
    if (!donor.city) return 0;

    if (donor.city.toLowerCase() === location.toLowerCase()) return 100;
    if (donor.city.toLowerCase().includes(location.toLowerCase()) ||
        location.toLowerCase().includes(donor.city.toLowerCase())) return 70;

    return 0;
  }

  /**
   * Calculate donation history score (0-100)
   * Considers total donations, largest gift, and giving consistency
   */
  private calculateDonationScore(donor: Donor): number {
    const totalDonations = donor.totalDonations || 0;
    const largestGift = donor.largestGift || 0;

    const totalScore = Math.min(100, (totalDonations / 100000) * 50);
    const largestGiftScore = Math.min(100, (largestGift / 50000) * 30);
    const consistencyScore = donor.firstGiftDate && donor.lastGiftDate ? 20 : 0;

    return totalScore + largestGiftScore + consistencyScore;
  }

  /**
   * Calculate recency score (0-100)
   * Recent donors are more likely to engage again
   */
  private calculateRecencyScore(donor: Donor): number {
    if (!donor.lastGiftDate) return 0;

    const daysSinceLastGift = (Date.now() - new Date(donor.lastGiftDate).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastGift < 30) return 100;
    if (daysSinceLastGift < 90) return 80;
    if (daysSinceLastGift < 180) return 60;
    if (daysSinceLastGift < 365) return 40;
    if (daysSinceLastGift < 730) return 20;
    return 0;
  }

  /**
   * Calculate engagement score (0-100)
   * Based on event subscriptions and communication preferences
   */
  private calculateEngagementScore(donor: Donor): number {
    let score = 0;

    if (donor.subscriptionEventsInPerson) score += 50;
    if (donor.subscriptionNewsletter) score += 30;
    if (donor.email) score += 20;

    return Math.min(100, score);
  }

  /**
   * Calculate giving capacity score (0-100)
   * Estimates donor's ability to give based on history and organization affiliation
   */
  private calculateCapacityScore(donor: Donor): number {
    const totalDonations = donor.totalDonations || 0;
    const largestGift = donor.largestGift || 0;

    const hasOrganization = donor.organization ? 20 : 0;
    const donationLevel = Math.min(50, (totalDonations / 50000) * 50);
    const giftCapacity = Math.min(30, (largestGift / 25000) * 30);

    return hasOrganization + donationLevel + giftCapacity;
  }

  /**
   * Main matching algorithm
   * Returns scored and ranked donors based on criteria
   */
  async findMatches(
    criteria: MatchingCriteria,
    customWeights?: Partial<MatchingWeights>,
  ): Promise<ScoredDonor[]> {
    const {
      eventType,
      location,
      minTotalDonations = 0,
      targetAttendees = 100,
      eventFocus = 'fundraising',
    } = criteria;

    const weights = { ...this.getDefaultWeights(eventFocus), ...customWeights };

    // Get all active donors
    const donors = await this.donorRepository.find({
      where: {
        exclude: false,
        deceased: false,
      },
    });

    // Filter by minimum donations
    const eligibleDonors = donors.filter(d => (d.totalDonations || 0) >= minTotalDonations);

    // Score each donor
    const scoredDonors: ScoredDonor[] = eligibleDonors.map(donor => {
      const interestScore = this.calculateInterestScore(donor, eventType);
      const locationScore = this.calculateLocationScore(donor, location);
      const donationScore = this.calculateDonationScore(donor);
      const recencyScore = this.calculateRecencyScore(donor);
      const engagementScore = this.calculateEngagementScore(donor);
      const capacityScore = this.calculateCapacityScore(donor);

      const score =
        interestScore * weights.interestMatch +
        locationScore * weights.locationMatch +
        donationScore * weights.donationHistory +
        recencyScore * weights.recency +
        engagementScore * weights.engagement +
        capacityScore * weights.capacity;

      const matchReasons: string[] = [];
      if (interestScore > 70) matchReasons.push('Strong interest alignment');
      if (locationScore === 100) matchReasons.push('Same location');
      if (donationScore > 80) matchReasons.push('Major donor');
      if (recencyScore > 80) matchReasons.push('Recent donor');
      if (engagementScore > 70) matchReasons.push('Highly engaged');
      if (capacityScore > 70) matchReasons.push('High capacity');

      return {
        donor,
        score,
        breakdown: {
          interestScore,
          locationScore,
          donationScore,
          recencyScore,
          engagementScore,
          capacityScore,
        },
        matchReasons,
      };
    });

    return scoredDonors
      .sort((a, b) => b.score - a.score)
      .slice(0, targetAttendees);
  }
}

