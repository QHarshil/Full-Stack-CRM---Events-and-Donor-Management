import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Entities
import { User } from './entities/user.entity';
import { Donor } from './entities/donor.entity';
import { Event } from './entities/event.entity';
import { EventDonor } from './entities/event-donor.entity';
import { AuditLog } from './entities/audit-log.entity';

// Services
import { SeederService } from './services/seeder.service';

// Feature modules
import { AuthModule } from './modules/auth.module';
import { DonorsModule } from './modules/donors.module';
import { EventsModule } from './modules/events.module';
import { AnalyticsModule } from './modules/analytics.module';
import { AdminModule } from './modules/admin.module';
import { AuditTrailModule } from './modules/audit-trail.module';

// Middleware
import { CurrentUserMiddleware } from './middleware/current-user.middleware';

const cookieSession = require('cookie-session');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_NAME || 'bc-cancer-crm.db',
      entities: [User, Donor, Event, EventDonor, AuditLog],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([User, Donor, Event, EventDonor, AuditLog]),
    EventEmitterModule.forRoot(),
    AuthModule,
    DonorsModule,
    EventsModule,
    AnalyticsModule,
    AdminModule,
    AuditTrailModule,
  ],
  providers: [SeederService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        cookieSession({
          keys: [process.env.COOKIE_KEY || 'default-secret-key'],
        }),
        CurrentUserMiddleware,
      )
      .forRoutes('*');
  }
}
