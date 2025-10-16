import {
  Controller,
  Post,
  Body,
  Get,
  Session,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { User, UserRole } from '../entities/user.entity';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuditTrailService } from '../services/audit-trail.service';
import { AuditAction } from '../entities/audit-log.entity';
import { extractRequestIp } from '../utils/request-ip.util';
import { userAuditSnapshot } from '../utils/audit-snapshots.util';
import * as bcrypt from 'bcrypt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  @Post('signup')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new user account' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async signup(
    @Body() body: { username: string; email: string; password: string; role?: UserRole },
    @Session() session: any,
    @CurrentUser() actor: User,
    @Req() req: Request,
  ) {
    const { username, email, password, role = UserRole.STAFF } = body;

    // Check if user exists
    const existing = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existing) {
      throw new Error('Username or email already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      role,
      isActive: true,
    });

    await this.userRepository.save(user);

    await this.auditTrailService.log({
      action: AuditAction.CREATE,
      entityType: 'user',
      entityId: user.id,
      userId: actor?.id,
      ipAddress: extractRequestIp(req) ?? null,
      after: userAuditSnapshot(user),
      metadata: {
        actor: actor ? { id: actor.id, username: actor.username, role: actor.role } : undefined,
        assignedRole: user.role,
      },
    });

    // Set session
    session.userId = user.id;

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in to existing account' })
  @ApiResponse({ status: 200, description: 'Signed in successfully' })
  async signin(
    @Body() body: { username: string; password: string },
    @Session() session: any,
    @Req() req: Request,
  ) {
    const { username, password } = body;

    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    // Update last login
    const previousLastLoginAt = user.lastLoginAt;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    await this.auditTrailService.log({
      action: AuditAction.LOGIN,
      entityType: 'user',
      entityId: user.id,
      userId: user.id,
      ipAddress: extractRequestIp(req) ?? null,
      before: previousLastLoginAt ? { lastLoginAt: previousLastLoginAt } : null,
      after: { lastLoginAt: user.lastLoginAt },
      metadata: {
        username: user.username,
      },
    });

    // Set session
    session.userId = user.id;

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out current user' })
  async signout(@Session() session: any, @CurrentUser() user: User, @Req() req: Request) {
    const ipAddress = extractRequestIp(req) ?? null;
    const userId = user?.id;

    session.userId = null;

    await this.auditTrailService.log({
      action: AuditAction.LOGOUT,
      entityType: 'user',
      entityId: userId ?? undefined,
      userId: userId ?? undefined,
      ipAddress,
      metadata: {
        username: user?.username,
      },
    });

    return { message: 'Signed out successfully' };
  }

  @Get('whoami')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, description: 'Current user info' })
  whoami(@CurrentUser() user: User) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
