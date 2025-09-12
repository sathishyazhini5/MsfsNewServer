import { PrismaClient } from '@prisma/client';
export const validateTokenData = async (tokenData) => {
    console.log("token", tokenData);
    const { user_id } = tokenData; // Use user_id instead of userId based on your token structure
    const prisma = new PrismaClient();

    // Fetch the user based on user_id
    const user = await prisma.users_mst.findUnique({ where: { user_id } });

    await prisma.$disconnect(); // Disconnect Prisma client
    return user; // Return user details if found
};