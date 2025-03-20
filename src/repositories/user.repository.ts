// src/repositories/user.repository.ts

import { Injectable } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

export interface UserCreateDTO {
    clerkId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isAdmin?: boolean;
}

export interface UserUpdateDTO {
    email?: string;
    firstName?: string;
    lastName?: string;
    isAdmin?: boolean;
}

@Injectable()
export class UserRepository {
    constructor(private prisma: PrismaService) { }

    /**
     * Create a new user
     * @param data User data
     * @returns Created user
     */
    async create(data: UserCreateDTO): Promise<User> {
        return this.prisma.user.create({
            data
        });
    }

    /**
     * Find a user by ID
     * @param id User ID
     * @returns User or null if not found
     */
    async findById(id: number): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id }
        });
    }

    /**
     * Find a user by Clerk ID
     * @param clerkId Clerk user ID
     * @returns User or null if not found
     */
    async findByClerkId(clerkId: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { clerkId }
        });
    }

    /**
     * Find a user by email
     * @param email User email
     * @returns User or null if not found
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { email }
        });
    }

    /**
     * Get all users
     * @returns Array of users
     */
    async findAll(): Promise<User[]> {
        return this.prisma.user.findMany();
    }

    /**
     * Update a user
     * @param id User ID
     * @param data Updated user data
     * @returns Updated user or null if not found
     */
    async update(id: number, data: UserUpdateDTO): Promise<User | null> {
        try {
            return await this.prisma.user.update({
                where: { id },
                data
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // Record not found
                if (error.code === 'P2025') {
                    return null;
                }
            }
            throw error;
        }
    }

    /**
     * Delete a user
     * @param id User ID
     * @returns true if deleted successfully, false otherwise
     */
    async delete(id: number): Promise<boolean> {
        try {
            await this.prisma.user.delete({
                where: { id }
            });
            return true;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                // Record not found
                if (error.code === 'P2025') {
                    return false;
                }
            }
            throw error;
        }
    }

    /**
     * Update user admin status
     * @param id User ID
     * @param isAdmin New admin status
     * @returns Updated user or null if not found
     */
    async updateAdminStatus(id: number, isAdmin: boolean): Promise<User | null> {
        return this.update(id, { isAdmin });
    }

    /**
     * Get all projects for a user
     * @param userId User ID
     * @returns Array of projects
     */
    async getUserProjects(userId: number): Promise<any[]> {
        return this.prisma.project.findMany({
            where: { userId }
        });
    }
}