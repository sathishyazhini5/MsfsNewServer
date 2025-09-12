import { PrismaClient } from '@prisma/client';

import { JWT_SECRET } from "../../config/index.js";
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";

export const createQuickCodeMember = async (req, res) => {
    const { quick_code_type, language_code, quickcode_name, created_by } = req.body;
  
    // Ensure the quick_code_type is 'memtyp' only
    if (quick_code_type !== 'memtyp') {
        return res.status(400).json({ error: 'quick_code_type must be memtyp' });
    }

    try {
        // Verify that the quick_code_type 'memtyp' is a valid meta_code
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
  
        let newQuickCode = 'M001';
        if (existingCodes.length > 0) {
            const lastCode = existingCodes[0].quick_code;
            const lastCodeNumber = parseInt(lastCode.slice(1)) + 1;
            newQuickCode = 'M' + String(lastCodeNumber).padStart(3, '0');
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

export const getMemberTypeNames = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const provinceName = decoded.province_name;

    // Find the corresponding province_code based on province_name
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the logged-in user" });
    }

    const provinceCode = province.province_code;
      const quickCodeNames = await prisma.quickcode_mst.findMany({
        where: {
          quick_code_type: 'memtyp',
          province_code:provinceCode
        },
        select: {
          quickcode_name: true,
          quick_code: true,
          quick_code_type: true,
        },
        orderBy: {
          quickcode_name: "asc", // Change this if another field defines the order
        },
      });
  
      if (quickCodeNames.length === 0) {
        return res.status(404).json({ message: 'No member types found' });
      }
  
      res.json(quickCodeNames);
    } catch (error) {
      console.error('Error retrieving member type names:', error);
      res.status(500).json({ error: 'Failed to retrieve member type names' });
    }
  };
  
  export const getMemberbyprovince = async (req, res) => {
    try {
      const { province_code } = req.query; // 📥 Take from query like ?province_code=PR001
  
      if (!province_code) {
        return res.status(400).json({ error: 'Province code is required' });
      }
  
      const quickCodeNames = await prisma.quickcode_mst.findMany({
        where: {
          quick_code_type: 'memtyp',
          province_code: province_code
        },
        select: {
          quickcode_name: true,
          quick_code: true,
          quick_code_type: true,
        },
        orderBy: {
          quickcode_name: "asc",
        },
      });
  
      if (!quickCodeNames.length) {
        return res.status(404).json({ message: 'No member types found for this province' });
      }
  
      res.json(quickCodeNames);
    } catch (error) {
      console.error('Error retrieving member type names:', error);
      res.status(500).json({ error: 'Failed to retrieve member type names' });
    }
  };