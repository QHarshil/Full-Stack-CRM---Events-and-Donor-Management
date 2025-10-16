import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { EventDonor } from './event-donor.entity';

export enum EventStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'datetime' })
  date: Date;

  @Column()
  location: string;

  @Column({ type: 'simple-array' })
  eventType: string[];

  @Column({ type: 'real', default: 0 })
  targetAmount: number;

  @Column({ default: 0 })
  expectedAttendees: number;

  @Column({ type: 'text', default: EventStatus.PLANNED })
  status: EventStatus;

  @Column({ type: 'real', default: 0 })
  actualAmount: number;

  @Column({ default: 0 })
  actualAttendees: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => EventDonor, eventDonor => eventDonor.event, { cascade: true })
  eventDonors: EventDonor[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
