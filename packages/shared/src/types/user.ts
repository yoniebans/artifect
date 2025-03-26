export interface User {
    id: number;
    clerkId: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
}