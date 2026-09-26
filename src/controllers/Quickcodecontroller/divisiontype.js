import { PrismaClient } from '@prisma/client';
import { JWT_SECRET } from "../../config/index.js";
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";



export const createdivisiontyp = async (req, res) => {
  const { quick_code_type, language_code, quickcode_name, created_by } = req.body;

  // Ensure the quick_code_type is 'divtype' only
  if (quick_code_type !== 'divtyp') {
    return res.status(400).json({ error: 'quick_code_type must be divtyp' });
  }

  try {
    // Verify that the quick_code_type 'divtype' is a valid meta_code
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

    let newQuickCode = 'Div001';
    if (existingCodes.length > 0) {
      const lastCode = existingCodes[0].quick_code;
      const lastCodeNumber = parseInt(lastCode.slice(3)) + 1;
      newQuickCode = 'Div' + String(lastCodeNumber).padStart(3, '0');
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

export const getDivisionNames = async (req, res) => {
  const { quick_code_type } = req.query;

  try {
    // Check if the quick_code_type query parameter is set to 'divtyp'
    if (quick_code_type && quick_code_type !== 'divtyp') {
      return res.status(400).json({ error: 'quick_code_type must be divtype' });
    }

    // Get the authorization token from the request headers
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];  // Extract the token from the header
    jwt.verify(token, JWT_SECRET);

    // Division types are shared Quick Master records.
    const quickCodeNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'divtyp',  // Filter by division type
      },
      select: {
        quickcode_name: true,
        quick_code: true,
        quick_code_type: true,
      },
    });

    // Return the division types in the response
    res.json(quickCodeNames);

  } catch (error) {
    console.error('Error retrieving division names:', error);
    res.status(500).json({ error: 'Failed to retrieve division names' });
  }
};

