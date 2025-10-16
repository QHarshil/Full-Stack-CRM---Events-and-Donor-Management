import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Event } from './event.entity';
import { Donor } from './donor.entity';

export enum DonorStatus {
  INVITED = 'invited',
  CONFIRMED = 'confirmed',
  ATTENDED = 'attended',
  DECLINED = 'declined',
  NO_RESPONSE = 'no_response',
}

@Entity('event_donors')
export class EventDonor {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Event, event => event.eventDonors, { onDelete: 'CASCADE' })
  event: Event;

  @Column()
  eventId: number;

  @ManyToOne(() => Donor, donor => donor.eventDonors, { onDelete: 'CASCADE' })
  donor: Donor;

  @Column()
  donorId: number;

  @Column({ type: 'text', default: DonorStatus.INVITED })
  status: DonorStatus;

  @Column({ type: 'real', default: 0 })
  matchScore: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  invitedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  respondedAt: Date;
}

