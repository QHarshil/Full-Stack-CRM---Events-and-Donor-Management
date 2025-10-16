import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminService } from '../services/admin.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { User, UserRole } from '../entities/user.entity';
import { CurrentUser } from '../decorators/current-user.decorator';
import { extractRequestIp } from '../utils/request-ip.util';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiResponse({ status: 200, description: 'List of users without passwords' })
  async listUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update a user role (admin only)' })
  async updateUserRole(
    @Param('id', ParseIntPipe) userId: number,
    @Body() body: { role: UserRole },
    @CurrentUser() admin: User,
    @Req() req: Request,
  ) {
    return this.adminService.updateUserRole(admin, userId, body, extractRequestIp(req));
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user (admin only)' })
  async updateUserStatus(
    @Param('id', ParseIntPipe) userId: number,
    @Body() body: { isActive: boolean },
    @CurrentUser() admin: User,
    @Req() req: Request,
  ) {
    return this.adminService.updateUserStatus(admin, userId, body, extractRequestIp(req));
  }
}
