// src/api/controllers/user.controller.ts

import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    NotFoundException,
    ForbiddenException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UserRepository } from '../../repositories/user.repository';
import { Admin } from '../../auth/decorators/admin.decorator';

// Add this to your dto/user.dto.ts file
class UpdateUserAdminStatusDto {
    isAdmin: boolean;
}

/**
 * Controller for admin user management
 */
@ApiTags('admin')
@Controller('admin/users')
@Admin() // All routes in this controller require admin privileges
export class UserController {
    constructor(private readonly userRepository: UserRepository) { }

    /**
     * Get all users (admin only)
     */
    @Get()
    @ApiOperation({ summary: 'Get all users (admin only)' })
    @ApiResponse({ status: 200, description: 'Returns the list of all users' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    async getAllUsers() {
        return this.userRepository.findAll();
    }

    /**
     * Get user by ID (admin only)
     */
    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID (admin only)' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'Returns the user' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    async getUserById(@Param('id') id: string) {
        const user = await this.userRepository.findById(Number(id));
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }

    /**
     * Update user admin status (admin only)
     */
    @Patch(':id/admin-status')
    @ApiOperation({ summary: 'Update user admin status (admin only)' })
    @ApiParam({ name: 'id', description: 'User ID' })
    @ApiBody({ type: UpdateUserAdminStatusDto })
    @ApiResponse({ status: 200, description: 'Returns the updated user' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiResponse({ status: 403, description: 'Forbidden - requires admin privileges' })
    async updateAdminStatus(
        @Param('id') id: string,
        @Body() updateDto: UpdateUserAdminStatusDto
    ) {
        const updatedUser = await this.userRepository.updateAdminStatus(
            Number(id),
            updateDto.isAdmin
        );

        if (!updatedUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return updatedUser;
    }
}