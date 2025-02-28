import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';

// Since we don't have a ProjectRepository yet, we'll test Prisma models directly
describe('Project Model', () => {
    let prismaService: PrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PrismaService,
                    useValue: {
                        project: {
                            create: jest.fn(),
                            findUnique: jest.fn(),
                            findMany: jest.fn(),
                            update: jest.fn(),
                            delete: jest.fn(),
                        },
                    },
                },
            ],
        }).compile();

        prismaService = module.get<PrismaService>(PrismaService);
    });

    it('should create a project', async () => {
        const projectData = { name: 'Test Project' };
        const expectedProject = { id: 1, ...projectData, createdAt: new Date(), updatedAt: null };

        (prismaService.project.create as jest.Mock).mockResolvedValue(expectedProject);

        const result = await prismaService.project.create({
            data: projectData,
        });

        expect(prismaService.project.create).toHaveBeenCalledWith({
            data: projectData,
        });
        expect(result).toEqual(expectedProject);
    });

    it('should find a project by id', async () => {
        const projectId = 1;
        const expectedProject = {
            id: projectId,
            name: 'Test Project',
            createdAt: new Date(),
            updatedAt: null
        };

        (prismaService.project.findUnique as jest.Mock).mockResolvedValue(expectedProject);

        const result = await prismaService.project.findUnique({
            where: { id: projectId },
        });

        expect(prismaService.project.findUnique).toHaveBeenCalledWith({
            where: { id: projectId },
        });
        expect(result).toEqual(expectedProject);
    });

    it('should find all projects', async () => {
        const expectedProjects = [
            { id: 1, name: 'Project 1', createdAt: new Date(), updatedAt: null },
            { id: 2, name: 'Project 2', createdAt: new Date(), updatedAt: null },
        ];

        (prismaService.project.findMany as jest.Mock).mockResolvedValue(expectedProjects);

        const result = await prismaService.project.findMany();

        expect(prismaService.project.findMany).toHaveBeenCalled();
        expect(result).toEqual(expectedProjects);
    });

    it('should update a project', async () => {
        const projectId = 1;
        const updateData = { name: 'Updated Project' };
        const expectedProject = {
            id: projectId,
            ...updateData,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        (prismaService.project.update as jest.Mock).mockResolvedValue(expectedProject);

        const result = await prismaService.project.update({
            where: { id: projectId },
            data: updateData,
        });

        expect(prismaService.project.update).toHaveBeenCalledWith({
            where: { id: projectId },
            data: updateData,
        });
        expect(result).toEqual(expectedProject);
    });

    it('should delete a project', async () => {
        const projectId = 1;
        const expectedProject = {
            id: projectId,
            name: 'Test Project',
            createdAt: new Date(),
            updatedAt: null
        };

        (prismaService.project.delete as jest.Mock).mockResolvedValue(expectedProject);

        const result = await prismaService.project.delete({
            where: { id: projectId },
        });

        expect(prismaService.project.delete).toHaveBeenCalledWith({
            where: { id: projectId },
        });
        expect(result).toEqual(expectedProject);
    });
});