import { PrismaClient } from '@prisma/client';

import { JWT_SECRET } from "../../config/index.js";
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";


export const createLanguageMetadata = async (req, res) => {
  const { language_name, created_by, quick_code_type } = req.body;

  // Ensure the quick_code_type is 'lancode' only
  if (quick_code_type !== 'lancod') {
    return res.status(400).json({ error: 'quick_code_type must be lancode' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];

    // Verify and decode the token
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

    // Extract province information from token
    const provinceName = decoded.province_name;
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
    });

    if (!province) {
      return res.status(400).json({ error: 'Province not found in province_mst' });
    }

    const provinceCode = province.province_code;
    const createdBy = decoded.role_name || decoded.username || 'Unknown';

    // Verify that the quick_code_type 'lancode' is a valid meta_code
    const metaCodeEntry = await prisma.meta_data_mst.findFirst({
      where: {
        screen_code: 'qckcode',
        meta_code: quick_code_type,
      },
    });

    if (!metaCodeEntry) {
      return res.status(400).json({ error: 'Invalid quick_code_type' });
    }

    // Check if the language_name exists in languageMetadata
    const languageEntry = await prisma.languagemetadata.findFirst({
      where: {
        language_name,
      },
    });

    if (!languageEntry) {
      return res.status(400).json({ error: 'Language does not exist in languageMetadata' });
    }

    // Check for duplicate entry in quickcode_mst
    const duplicateEntry = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type,
        quick_code: languageEntry.language_code, // Use language_code directly as quick_code
      },
    });

    if (duplicateEntry) {
      return res.status(400).json({ error: 'Duplicate entry in quickcode_mst' });
    }

    // Create new entry in quickcode_mst using language_code as quick_code
    const newQuickcodeEntry = await prisma.quickcode_mst.create({
      data: {
        quick_code_type,
        quick_code: languageEntry.language_code, // Use language_code as quick_code
        quickcode_name: languageEntry.language_name,
        concurrency_val: 1,
        language_code: languageEntry.language_code,
        created_by: createdBy,
        created_date: new Date(),
        province_code: provinceCode,
      },
    });

    res.json(newQuickcodeEntry);
  } catch (error) {
    console.error('Error creating language metadata:', error);
    res.status(500).json({ error: 'Failed to create language metadata' });
  }
};


  
export const getLanguageMetadata = async (req, res) => {
    const { quick_code_type } = req.query;

    try {
        if (quick_code_type && quick_code_type !== 'lancod') {
            return res.status(400).json({ error: 'quick_code_type must be lancod' });
        }

        const languageMetadata = await prisma.languageMetadata.findMany({
            select: {
                language_name: true,
                language_code: true,
                quick_code_type: true, // Assuming you want to include this field
            },
        });

        if (languageMetadata.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        res.json(languageMetadata);
    } catch (error) {
        console.error('Error retrieving language metadata:', error);
        res.status(500).json({ error: 'Failed to retrieve language metadata' });
    }
};



export const getLanguagedetails = async (req, res) => {
    try {
      const languagegroups = await prisma.languagemetadata.findMany({
        select: {
          language_name: true,
          language_code: true
        }
      });
  
      if (languagegroups.length === 0) {
        return res.status(404).json({ message: 'No data found' });
      }
  
      res.json(languagegroups);
    } catch (error) {
      console.error('Error retrieving Language names:', error);
      res.status(500).json({ error: 'Failed to retrieve Language names' });
    }
  }
  export const getLanguageNames = async (req, res) => {
    const { quick_code_type } = req.query;
  
    try {

      const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }
    const token = authHeader.split(" ")[1];

    // Verify and decode the token
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

    // Extract created_by from token
    const provinceName = decoded.province_name;
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the logged-in user" });
    }

    const provinceCode = province.province_code;
      if (quick_code_type && quick_code_type !== 'lancod') {
        return res.status(400).json({ error: 'quick_code_type must be lancod' });
      }
  
      const quickCodeNames = await prisma.quickcode_mst.findMany({
        where: {
          quick_code_type: 'lancod',
          province_code:provinceCode
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


