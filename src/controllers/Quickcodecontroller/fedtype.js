import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import jwt from "jsonwebtoken";

export const createQuickCodeFedtyp = async (req, res) => {
  const { quick_code_type, language_code, quickcode_name, created_by } = req.body;

  // Ensure the quick_code_type is 'fedtyp' only
  if (quick_code_type !== 'fedtyp') {
      return res.status(400).json({ error: 'quick_code_type must be fedtyp' });
  }

  try {
      // Verify that the quick_code_type 'fedtyp' is a valid meta_code
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

      let newQuickCode = 'FED001';
      if (existingCodes.length > 0) {
          const lastCode = existingCodes[0].quick_code;
          // const lastCodeNumber = parseInt(lastCode.slice(3)) + 1;  // Extract number after 'FED'
          const lastCodeNumber = parseInt(lastCode.slice(3)) + 1;  // Extract number after 'FED'

          newQuickCode = 'FED' + String(lastCodeNumber).padStart(3, '0');
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


export const getFedTypeNames = async (req, res) => {
  try {

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token has expired" });
        }
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ error: "Invalid token" });
        }
        return res.status(500).json({ error: "Failed to verify token" });
    }

    const provinceNameFromToken = decoded.province_name;

    if (!provinceNameFromToken) {
        return res.status(400).json({ error: "Province information is missing in token" });
    }

    const province = await prisma.province_mst.findFirst({
        where: { province_name: provinceNameFromToken },
        select: { province_code: true },
    });

    if (!province) {
        return res.status(404).json({ error: "Province not found for the given name" });
    }

    const provinceCode = province.province_code; // Extract province_code
    const quickCodeNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'fedtyp',
        province_code: provinceCode
      },
      select: {
        quickcode_name: true,
        quick_code: true,
        quick_code_type: true,
      },
    });

    if (quickCodeNames.length === 0) {
      return res.status(404).json({ message: 'No feedback types found' });
    }

    res.json(quickCodeNames);
  } catch (error) {
    console.error('Error retrieving feedback type names:', error);
    res.status(500).json({ error: 'Failed to retrieve feedback type names' });
  }
}

