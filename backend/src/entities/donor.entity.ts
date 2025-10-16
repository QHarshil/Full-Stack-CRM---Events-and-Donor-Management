import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { EventDonor } from './event-donor.entity';

@Entity('donors')
export class Donor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  organization: string;

  @Column()
  addressLine1: string;

  @Column({ nullable: true })
  addressLine2: string;

  @Column()
  city: string;

  @Column()
  province: string;

  @Column()
  postalCode: string;

  @Column({ type: 'simple-array', nullable: true })
  interests: string[];

  @Column({ type: 'real', default: 0 })
  totalDonations: number;

  @Column({ type: 'real', default: 0 })
  largestGift: number;

  @Column({ type: 'datetime', nullable: true })
  firstGiftDate: Date;

  @Column({ type: 'datetime', nullable: true })
  lastGiftDate: Date;

  @Column({ type: 'real', default: 0 })
  lastGiftAmount: number;

  @Column({ default: false })
  subscriptionEventsInPerson: boolean;

  @Column({ default: false })
  subscriptionNewsletter: boolean;

  @Column({ default: false })
  exclude: boolean;

  @Column({ default: false })
  deceased: boolean;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => EventDonor, eventDonor => eventDonor.donor)
  eventDonors: EventDonor[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

