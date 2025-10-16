import { User } from '../entities/user.entity';
import { Event } from '../entities/event.entity';
import { EventDonor } from '../entities/event-donor.entity';

export function userAuditSnapshot(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function eventAuditSnapshot(event: Event) {
  return {
    id: event.id,
    name: event.name,
    status: event.status,
    date: event.date,
    location: event.location,
    targetAmount: event.targetAmount,
    actualAmount: event.actualAmount,
    expectedAttendees: event.expectedAttendees,
    actualAttendees: event.actualAttendees,
  };
}

export function eventDonorAuditSnapshot(eventDonor: EventDonor) {
  return {
    eventId: eventDonor.eventId,
    donorId: eventDonor.donorId,
    status: eventDonor.status,
    matchScore: eventDonor.matchScore,
    respondedAt: eventDonor.respondedAt,
    notes: eventDonor.notes,
  };
}
