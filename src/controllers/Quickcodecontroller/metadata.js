import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMetaCodeNames = async (req, res) => {
  try {
    const metaCodeNames = await prisma.meta_data_mst.findMany({
      select: {
        meta_code_name: true,
      },
    });

    res.json(metaCodeNames);
  } catch (error) {
    console.error('Error retrieving meta code names:', error);
    res.status(500).json({ error: 'Failed to retrieve meta code names' });
  }
};
