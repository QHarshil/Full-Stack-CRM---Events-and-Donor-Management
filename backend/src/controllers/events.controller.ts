import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { EventDonor, DonorStatus } from '../entities/event-donor.entity';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Request } from 'express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { AuditTrailService } from '../services/audit-trail.service';
import { AuditAction } from '../entities/audit-log.entity';
import { extractRequestIp } from '../utils/request-ip.util';
import { eventAuditSnapshot, eventDonorAuditSnapshot } from '../utils/audit-snapshots.util';

@ApiTags('events')
@Controller('events')
@UseGuards(AuthGuard, RolesGuard)
export class EventsController {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventDonor)
    private eventDonorRepository: Repository<EventDonor>,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  @ApiResponse({ status: 200, description: 'List of events' })
  async findAll() {
    return this.eventRepository.find({
      order: { date: 'ASC' },
      relations: ['eventDonors'],
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventRepository.findOne({
      where: { id },
      relations: ['eventDonors', 'eventDonors.donor'],
    });
  }

  @Post()
  @ApiOperation({ summary: 'Create new event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @Body() eventData: Partial<Event>,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const event = this.eventRepository.create(eventData);
    const savedEvent = await this.eventRepository.save(event);

    await this.auditTrailService.log({
      action: AuditAction.CREATE,
      entityType: 'event',
      entityId: savedEvent.id,
      userId: user?.id,
      ipAddress: extractRequestIp(req) ?? null,
      after: eventAuditSnapshot(savedEvent),
      metadata: {
        actor: user ? { id: user.id, username: user.username } : undefined,
        status: savedEvent.status,
      },
    });

    return savedEvent;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update event' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() eventData: Partial<Event>,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const existing = await this.eventRepository.findOne({ where: { id } });

    if (!existing) {
      throw new Error('Event not found');
    }

    const before = eventAuditSnapshot(existing);

    await this.eventRepository.update(id, eventData);
    const updated = await this.eventRepository.findOne({ where: { id } });

    await this.auditTrailService.log({
      action: AuditAction.UPDATE,
      entityType: 'event',
      entityId: id,
      userId: user?.id,
      ipAddress: extractRequestIp(req) ?? null,
      before,
      after: updated ? eventAuditSnapshot(updated) : null,
      metadata: {
        actor: user ? { id: user.id, username: user.username } : undefined,
        updatedFields: Object.keys(eventData ?? {}),
      },
    });

    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete event' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const existing = await this.eventRepository.findOne({ where: { id } });

    await this.eventRepository.delete(id);

    await this.auditTrailService.log({
      action: AuditAction.DELETE,
      entityType: 'event',
      entityId: id,
      userId: user?.id,
      ipAddress: extractRequestIp(req) ?? null,
      before: existing ? eventAuditSnapshot(existing) : null,
      metadata: {
        actor: user ? { id: user.id, username: user.username } : undefined,
      },
    });

    return { message: 'Event deleted successfully' };
  }

  @Post(':id/donors')
  @ApiOperation({ summary: 'Add donors to event' })
  @ApiResponse({ status: 201, description: 'Donors added to event' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async addDonors(
    @Param('id', ParseIntPipe) eventId: number,
    @Body() body: { donorIds: number[]; matchScores?: Record<number, number> },
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const { donorIds = [], matchScores = {} } = body;

    if (!donorIds.length) {
      return {
        message: 'No donors provided',
        count: 0,
      };
    }

    const existingRelationships = await this.eventDonorRepository.find({
      where: donorIds.map(donorId => ({ eventId, donorId })),
    });

    const existingDonorIds = new Set(existingRelationships.map(rel => rel.donorId));
    const newDonorIds = donorIds.filter(donorId => !existingDonorIds.has(donorId));

    if (newDonorIds.length === 0) {
      return {
        message: 'All donors are already invited to this event',
        count: 0,
      };
    }

    const eventDonors = newDonorIds.map(donorId =>
      this.eventDonorRepository.create({
        eventId,
        donorId,
        status: DonorStatus.INVITED,
        matchScore: matchScores[donorId] || 0,
      }),
    );

    await this.eventDonorRepository.save(eventDonors);

    await this.auditTrailService.log({
      action: AuditAction.CREATE,
      entityType: 'event_donor',
      entityId: eventId,
      userId: user?.id,
      ipAddress: extractRequestIp(req) ?? null,
      after: {
        added: eventDonors.map(ed => eventDonorAuditSnapshot(ed)),
      },
      metadata: {
        actor: user ? { id: user.id, username: user.username } : undefined,
        source: 'bulk_invite',
      },
    });

    return {
      message: `Added ${newDonorIds.length} donors to event`,
      count: newDonorIds.length,
    };
  }

  @Put(':eventId/donors/:donorId')
  @ApiOperation({ summary: 'Update donor status for event' })
  @ApiResponse({ status: 200, description: 'Donor status updated' })
  async updateDonorStatus(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('donorId', ParseIntPipe) donorId: number,
    @Body() body: { status: DonorStatus; notes?: string },
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const eventDonor = await this.eventDonorRepository.findOne({
      where: { eventId, donorId },
    });

    if (!eventDonor) {
      throw new Error('Event donor relationship not found');
    }

    const before = eventDonorAuditSnapshot(eventDonor);

    eventDonor.status = body.status;
    if (body.notes) {
      eventDonor.notes = body.notes;
    }
    eventDonor.respondedAt = new Date();

    await this.eventDonorRepository.save(eventDonor);

    await this.auditTrailService.log({
      action: AuditAction.UPDATE,
      entityType: 'event_donor',
      entityId: eventId,
      userId: user?.id,
      ipAddress: extractRequestIp(req) ?? null,
      before,
      after: eventDonorAuditSnapshot(eventDonor),
      metadata: {
        actor: user ? { id: user.id, username: user.username } : undefined,
        donorId,
      },
    });

    return eventDonor;
  }

  @Delete(':eventId/donors/:donorId')
  @ApiOperation({ summary: 'Remove donor from event' })
  @ApiResponse({ status: 200, description: 'Donor removed from event' })
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async removeDonor(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('donorId', ParseIntPipe) donorId: number,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const existingRelationship = await this.eventDonorRepository.findOne({
      where: { eventId, donorId },
    });

    await this.eventDonorRepository.delete({ eventId, donorId });

    await this.auditTrailService.log({
      action: AuditAction.DELETE,
      entityType: 'event_donor',
      entityId: eventId,
      userId: user?.id,
      ipAddress: extractRequestIp(req) ?? null,
      before: existingRelationship ? eventDonorAuditSnapshot(existingRelationship) : null,
      metadata: {
        actor: user ? { id: user.id, username: user.username } : undefined,
        donorId,
      },
    });

    return {
      message: 'Donor removed from event',
      donorId,
      eventId,
    };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get event statistics' })
  @ApiResponse({ status: 200, description: 'Event statistics' })
  async getEventStats(@Param('id', ParseIntPipe) id: number) {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['eventDonors'],
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const statusCounts = event.eventDonors.reduce((acc, ed) => {
      acc[ed.status] = (acc[ed.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalInvited: event.eventDonors.length,
      confirmed: statusCounts[DonorStatus.CONFIRMED] || 0,
      attended: statusCounts[DonorStatus.ATTENDED] || 0,
      declined: statusCounts[DonorStatus.DECLINED] || 0,
      noResponse: statusCounts[DonorStatus.NO_RESPONSE] || 0,
      targetAmount: event.targetAmount,
      actualAmount: event.actualAmount,
      expectedAttendees: event.expectedAttendees,
      actualAttendees: event.actualAttendees,
    };
  }
}
