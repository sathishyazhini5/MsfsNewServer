import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createQuickCode = async (req, res) => {
  const { quick_code_type, language_code, quickcode_name, created_by } = req.body;

  // Generate new quick code
  const existingCodes = await prisma.quickcode_mst.findMany({
    where: { quick_code_type },
    orderBy: { quick_code: 'desc' },
    take: 1,
  });

  let newQuickCode = 'D001';
  if (existingCodes.length > 0) {
    const lastCode = existingCodes[0].quick_code;
    const lastCodeNumber = parseInt(lastCode.slice(1)) + 1;
    newQuickCode = 'D' + String(lastCodeNumber).padStart(3, '0');
  }

  try {
    const newQuickCodeEntry = await prisma.quickcode_mst.create({
      data: {
        quick_code_type,
        quick_code: newQuickCode,
        language_code,
        quickcode_name,
        concurrency_val: 0,
        created_by,
        created_date: new Date(),
      },
    });
    res.json(newQuickCodeEntry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create quick code' });
  }
};
