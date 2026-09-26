import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import jwt from 'jsonwebtoken';


export const createNationalityMetadata = async (req, res) => {
  const { nationality, code, created_by, quick_code_type } = req.body;

  // Ensure the quick_code_type is 'natlty' only
  if (quick_code_type !== 'natlty') {
    return res.status(400).json({ error: 'quick_code_type must be natlty' });
  }

  // Ensure all required fields are provided
  if (!nationality || !code || !created_by || !quick_code_type) {
    return res.status(400).json({ error: 'Missing required fields' });
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

    const createdBy = decoded.role_name || decoded.username || 'Unknown';
    // Verify that the quick_code_type 'natlty' is a valid meta_code
    const metaCodeEntry = await prisma.meta_data_mst.findFirst({
      where: {
        screen_code: 'qckcode',
        meta_code: quick_code_type,
      },
    });

    if (!metaCodeEntry) {
      return res.status(400).json({ error: 'Invalid quick_code_type' });
    }

    // Check if the nationality already exists in quickcode_mst
      const existingNationality = await prisma.quickcode_mst.findFirst({
        where: {
          quick_code_type,
          quickcode_name: nationality,
        },
      });

    if (existingNationality) {
      return res.status(400).json({ error: 'Nationality already exists' });
    }

    // Generate new quick code for quickcode_mst table
    const existingCodes = await prisma.quickcode_mst.findMany({
      where: { quick_code_type },
      orderBy: { quick_code: 'desc' },
      take: 1,
    });

    let newQuickCode = 'N001';
    if (existingCodes.length > 0) {
      const lastCode = existingCodes[0].quick_code;
      const lastCodeNumber = parseInt(lastCode.slice(1)) + 1;
      newQuickCode = 'N' + String(lastCodeNumber).padStart(3, '0');
    }

    // Ensure values are within column limits
    if (
      quick_code_type.length > 10 ||
      newQuickCode.length > 10 ||
      nationality.length > 100 ||
      code.length > 3 || // Adjusted for 3-character nationality code
      created_by.length > 50
    ) {
      console.error('Data exceeds column limits:', {
        quick_code_type,
        newQuickCode,
        nationality,
        code,
        created_by
      });
      return res.status(400).json({ error: 'One or more values exceed column limits' });
    }

    console.log('Data being inserted:', {
      quick_code_type,
      quick_code: newQuickCode,
      quickcode_name: nationality,
      concurrency_val: 1,
      language_code: 'en', // Default language code
      created_by:createdBy,
      created_date: new Date(),
    });

    // Create new entry in quickcode_mst
    const newQuickcodeEntry = await prisma.quickcode_mst.create({
      data: {
        quick_code_type,
        quick_code: newQuickCode,
        quickcode_name: nationality,
        concurrency_val: 1,
        language_code: 'en', // Default language code
        created_by:createdBy,
        created_date: new Date(),
      },
    });

    res.json(newQuickcodeEntry);
  } catch (error) {
    console.error('Error creating nationality metadata:', error);
    res.status(500).json({ error: 'Failed to create nationality metadata' });
  }
};



export const getNationalityMetadata = async (req, res) => {
  const { quick_code_type } = req.query;

  try {
    if (quick_code_type && quick_code_type !== 'natlty') {
      return res.status(400).json({ error: 'quick_code_type must be natlty' });
    }

      const nationalityMetadata = await prisma.quickcode_mst.findMany({
        where: { quick_code_type: 'natlty' },
      select: {
          quickcode_name: true,
          quick_code: true,
          quick_code_type: true,
      },
    });

    if (nationalityMetadata.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    res.json(nationalityMetadata);
  } catch (error) {
    console.error('Error retrieving nationality metadata:', error);
    res.status(500).json({ error: 'Failed to retrieve nationality metadata' });
  }
};

export const getNationalityDetails = async (req, res) => {
  try {
    const nationalityGroups = await prisma.nationalitymetadata.findMany({
      select: {
        nationality: true,
        code: true
      }
    });

    if (nationalityGroups.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    res.json(nationalityGroups);
  } catch (error) {
    console.error('Error retrieving nationality names:', error);
    res.status(500).json({ error: 'Failed to retrieve nationality names' });
  }
};

export const getNationalityNames = async (req, res) => {
  const { quick_code_type } = req.query;

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Access token is missing or invalid" });
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

    if (quick_code_type && quick_code_type !== 'natlty') {
      return res.status(400).json({ error: 'quick_code_type must be natlty' });
    }

    const quickCodeNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'natlty',
      },
      select: {
        quickcode_name: true,
        quick_code: true,
        quick_code_type: true,
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