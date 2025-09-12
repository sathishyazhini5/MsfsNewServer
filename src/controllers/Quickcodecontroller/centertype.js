import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createQuickCode = async (req, res) => {
  const { quick_code_type, language_code, quickcode_name, created_by } = req.body;

  // Ensure the quick_code_type is 'ctrtyp' only
  if (quick_code_type !== 'ctrtyp') {
    return res.status(400).json({ error: 'quick_code_type must be ctrtyp' });
  }

  try {
    // Verify that the quick_code_type 'ctrtyp' is a valid meta_code
    const metaCodeEntry = await prisma.meta_data_mst.findFirst({
      where: {
        screen_code: 'qckcode',
        meta_code: quick_code_type,
      },
    });

    if (!metaCodeEntry) {
      return res.status(400).json({ error: 'Invalid quick_code_type' });
    }

    // Check for duplicate quickcode_name
    const duplicateEntry = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type,
        quickcode_name,
      },
    });

    if (duplicateEntry) {
      return res.status(400).json({ error: 'Duplicate quickcode_name for the provided quick_code_type' });
    }

    // Generate new quick code
    const existingCodes = await prisma.quickcode_mst.findMany({
      where: { quick_code_type },
      orderBy: { quick_code: 'desc' },
      take: 1,
    });

    let newQuickCode = 'C001';
    if (existingCodes.length > 0) {
      const lastCode = existingCodes[0].quick_code;
      const lastCodeNumber = parseInt(lastCode.slice(1)) + 1;
      newQuickCode = 'C' + String(lastCodeNumber).padStart(3, '0');
    }

    // Create new quick code entry
    const newQuickCodeEntry = await prisma.quickcode_mst.create({
      data: {
        quick_code_type,
        quick_code: newQuickCode,
        language_code,
        quickcode_name,
        concurrency_val: 1,
        created_by,
        created_date: new Date(),
      },
    });

    res.json(newQuickCodeEntry);
  } catch (error) {
    console.error('Error creating quick code:', error);
    res.status(500).json({ error: 'Failed to create quick code' });
  }
};

export const getCenterNames = async (req, res) => {
  const { quick_code_type } = req.query;

  try {
    if (quick_code_type && quick_code_type !== 'ctrtyp') {
      return res.status(400).json({ error: 'quick_code_type must be ctrtyp' });
    }

    const quickCodeNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'ctrtyp',
      },
      select: {
        quickcode_name: true,
        quick_code: true,
        quick_code_type: true, // Include quick_code_type in the selection
      },
    });

    if (quickCodeNames.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    res.json(quickCodeNames);
  } catch (error) {
    console.error('Error retrieving quick code names:', error);
    res.status(500).json({ error: 'Failed to retrieve quick code names' });
  }
};
