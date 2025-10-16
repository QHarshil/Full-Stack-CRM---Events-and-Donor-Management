import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Donor } from '../entities/donor.entity';
import { Event, EventStatus } from '../entities/event.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { AuditTrailService } from './audit-trail.service';
import { userAuditSnapshot, eventAuditSnapshot } from '../utils/audit-snapshots.util';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

/**
 * Seeder Service
 * Seeds the database with demo data for testing and demonstration
 */
@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);
  private readonly TOTAL_DONORS = 500;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Donor)
    private donorRepository: Repository<Donor>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  async onModuleInit() {
    await this.seedAll();
  }

  async seedAll() {
    await this.seedUsers();
    await this.seedDonors();
    await this.seedEvents();
    await this.seedBaselineAuditLogs();
  }

  private async seedUsers() {
    const count = await this.userRepository.count();
    if (count > 0) {
      this.logger.log('Users already seeded');
      return;
    }

    this.logger.log('Seeding users...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
      {
        username: 'admin',
        email: 'admin@bccancer.ca',
        password: hashedPassword,
        role: UserRole.ADMIN,
        firstName: 'Admin',
        lastName: 'User',
        department: 'Administration',
        isActive: true,
      },
      {
        username: 'manager',
        email: 'manager@bccancer.ca',
        password: hashedPassword,
        role: UserRole.MANAGER,
        firstName: 'Sarah',
        lastName: 'Johnson',
        department: 'Donor Relations',
        isActive: true,
      },
      {
        username: 'staff',
        email: 'staff@bccancer.ca',
        password: hashedPassword,
        role: UserRole.STAFF,
        firstName: 'John',
        lastName: 'Smith',
        department: 'Events',
        isActive: true,
      },
    ];

    await this.userRepository.save(users);
    this.logger.log(`Seeded ${users.length} users (admin/manager/staff, password: password123)`);
  }

  private async seedDonors() {
    const count = await this.donorRepository.count();
    if (count >= this.TOTAL_DONORS) {
      this.logger.log('Donors already seeded');
      return;
    }

    this.logger.log(`Seeding ${this.TOTAL_DONORS} donors...`);

    const bcCities = [
      'Vancouver', 'Victoria', 'Kelowna', 'Kamloops', 'Nanaimo',
      'Prince George', 'Abbotsford', 'Chilliwack', 'Vernon', 'Penticton',
      'Campbell River', 'Courtenay', 'Cranbrook', 'Fort St. John', 'Surrey',
      'Burnaby', 'Richmond', 'Coquitlam', 'Langley', 'Delta'
    ];

    const cancerTypes = [
      'Breast Cancer', 'Lung Cancer', 'Prostate Cancer', 'Colon Cancer',
      'Melanoma', 'Leukemia', 'Lymphoma', 'Pancreatic Cancer',
      'Kidney Cancer', 'Bladder Cancer', 'Thyroid Cancer', 'Liver Cancer'
    ];

    const donors: Partial<Donor>[] = [];

    for (let i = 0; i < this.TOTAL_DONORS; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const city = faker.helpers.arrayElement(bcCities);
      
      // Create realistic donation patterns
      const donorType = faker.helpers.arrayElement(['major', 'regular', 'small', 'new']);
      let totalDonations = 0;
      let largestGift = 0;
      let firstGiftDate: Date;
      let lastGiftDate: Date;

      switch (donorType) {
        case 'major':
          totalDonations = faker.number.float({ min: 50000, max: 500000, fractionDigits: 2 });
          largestGift = faker.number.float({ min: 25000, max: 100000, fractionDigits: 2 });
          firstGiftDate = faker.date.past({ years: 10 });
          lastGiftDate = faker.date.recent({ days: 180 });
          break;
        case 'regular':
          totalDonations = faker.number.float({ min: 5000, max: 49999, fractionDigits: 2 });
          largestGift = faker.number.float({ min: 1000, max: 10000, fractionDigits: 2 });
          firstGiftDate = faker.date.past({ years: 5 });
          lastGiftDate = faker.date.recent({ days: 365 });
          break;
        case 'small':
          totalDonations = faker.number.float({ min: 100, max: 4999, fractionDigits: 2 });
          largestGift = faker.number.float({ min: 50, max: 1000, fractionDigits: 2 });
          firstGiftDate = faker.date.past({ years: 3 });
          lastGiftDate = faker.date.past({ years: 1 });
          break;
        case 'new':
          totalDonations = faker.number.float({ min: 50, max: 500, fractionDigits: 2 });
          largestGift = totalDonations;
          firstGiftDate = faker.date.recent({ days: 90 });
          lastGiftDate = firstGiftDate;
          break;
      }

      const donor: Partial<Donor> = {
        firstName,
        lastName,
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
        phone: faker.phone.number(),
        organization: faker.datatype.boolean() ? faker.company.name() : null,
        addressLine1: faker.location.streetAddress(),
        addressLine2: faker.datatype.boolean() ? faker.location.secondaryAddress() : null,
        city,
        province: 'BC',
        postalCode: faker.location.zipCode('V#V #V#'),
        interests: faker.helpers.arrayElements(cancerTypes, { min: 1, max: 4 }),
        totalDonations,
        largestGift,
        firstGiftDate,
        lastGiftDate,
        lastGiftAmount: faker.number.float({ min: 50, max: largestGift, fractionDigits: 2 }),
        subscriptionEventsInPerson: faker.datatype.boolean(),
        subscriptionNewsletter: faker.datatype.boolean(),
        exclude: faker.datatype.boolean({ probability: 0.05 }),
        deceased: faker.datatype.boolean({ probability: 0.02 }),
        notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
      };

      donors.push(donor);
    }

    // Batch insert
    const BATCH_SIZE = 100;
    for (let i = 0; i < donors.length; i += BATCH_SIZE) {
      const batch = donors.slice(i, i + BATCH_SIZE);
      await this.donorRepository.save(batch);
      this.logger.log(`  Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(donors.length / BATCH_SIZE)}`);
    }

    this.logger.log(`Seeded ${donors.length} donors`);
  }

  private async seedEvents() {
    const count = await this.eventRepository.count();
    if (count > 0) {
      this.logger.log('Events already seeded');
      return;
    }

    this.logger.log('Seeding events...');

    const now = new Date();
    const events: Partial<Event>[] = [
      {
        name: 'Breast Cancer Research Gala 2025',
        description: 'Annual fundraising gala supporting breast cancer research and patient care programs.',
        date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        location: 'Vancouver',
        eventType: ['Breast Cancer'],
        targetAmount: 500000,
        expectedAttendees: 200,
        status: EventStatus.PLANNED,
        notes: 'Coordinate keynote address with research director; confirm venue staging by May 1.',
      },
      {
        name: 'Lung Cancer Awareness Walk',
        description: 'Community walk to raise awareness and funds for lung cancer research.',
        date: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
        location: 'Victoria',
        eventType: ['Lung Cancer'],
        targetAmount: 100000,
        expectedAttendees: 500,
        status: EventStatus.PLANNED,
        notes: 'Secure permits with city hall; invite local media outlets two weeks prior.',
      },
      {
        name: 'Prostate Cancer Symposium',
        description: 'Educational symposium and fundraiser for prostate cancer research.',
        date: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        location: 'Kelowna',
        eventType: ['Prostate Cancer'],
        targetAmount: 250000,
        expectedAttendees: 150,
        status: EventStatus.PLANNED,
        notes: 'Finalize speaker lineup; coordinate breakout session materials.',
      },
      {
        name: 'Hope & Healing: Cancer Survivor Celebration',
        description: 'Celebrating cancer survivors and raising funds for support programs.',
        date: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
        location: 'Vancouver',
        eventType: ['Breast Cancer', 'Lung Cancer', 'Prostate Cancer'],
        targetAmount: 150000,
        expectedAttendees: 300,
        status: EventStatus.PLANNED,
        notes: 'Collect survivor stories for video montage; order commemorative gifts.',
      },
      {
        name: 'Pediatric Cancer Research Benefit',
        description: 'Special event focused on pediatric cancer research funding.',
        date: new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000),
        location: 'Surrey',
        eventType: ['Leukemia', 'Lymphoma'],
        targetAmount: 200000,
        expectedAttendees: 180,
        status: EventStatus.DRAFT,
        notes: 'Partner with children hospital ambassadors; design donor wall concept.',
      },
    ];

    await this.eventRepository.save(events);
    this.logger.log(`Seeded ${events.length} events`);
  }

  private async seedBaselineAuditLogs() {
    const existingLogs = await this.auditLogRepository.count();
    if (existingLogs > 0) {
      this.logger.log('Audit logs already seeded');
      return;
    }

    this.logger.log('Seeding baseline audit logs...');

    const [users, events, donorCount] = await Promise.all([
      this.userRepository.find(),
      this.eventRepository.find(),
      this.donorRepository.count(),
    ]);

    for (const user of users) {
      await this.auditTrailService.log({
        action: AuditAction.BASELINE,
        entityType: 'user',
        entityId: user.id,
        after: userAuditSnapshot(user),
        metadata: {
          seeded: true,
          source: 'bootstrap',
        },
      });
    }

    for (const event of events) {
      await this.auditTrailService.log({
        action: AuditAction.BASELINE,
        entityType: 'event',
        entityId: event.id,
        after: eventAuditSnapshot(event),
        metadata: {
          seeded: true,
          source: 'bootstrap',
        },
      });
    }

    if (donorCount > 0) {
      await this.auditTrailService.log({
        action: AuditAction.BASELINE,
        entityType: 'donor_collection',
        after: { totalDonors: donorCount },
        metadata: {
          seeded: true,
          source: 'bootstrap',
        },
      });
    }

    this.logger.log(
      `Baseline audit logs inserted (${users.length} users, ${events.length} events, ${donorCount} donors)`,
    );
  }
}



