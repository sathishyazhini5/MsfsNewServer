import { PrismaClient } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { HttpException } from '../../exceptions/HttpException.js';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export const createDateFormatMetadata = async (req, res) => {
  const { date_format_name, created_by } = req.body;

  const quick_code_type = 'datfmt';

  if (!date_format_name || !created_by) {
    return res.status(400).json({ error: 'date_format_name and created_by must be provided' });
  }

  try {
    // Verify that 'datfmt' exists as a valid meta_code
    const metaCodeEntry = await prisma.meta_data_mst.findFirst({
      where: {
        screen_code: 'qckcode',
        meta_code: quick_code_type,
      },
    });

    if (!metaCodeEntry) {
      return res.status(400).json({ error: 'Invalid quick_code_type: datfmt not found' });
    }

    // Check for duplicate entry in quickcode_mst
    const duplicateEntry = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type,
        quickcode_name: date_format_name,
      },
    });

    if (duplicateEntry) {
      return res.status(400).json({ error: 'Date format name already exists' });
    }

    // Generate a new unique quick code
    let newQuickCode;
    const existingCodes = await prisma.quickcode_mst.findMany({
      where: { quick_code_type },
      orderBy: { quick_code: 'desc' },
    });

    if (existingCodes.length > 0) {
      const lastCode = existingCodes[0].quick_code;
      const lastCodeNumber = parseInt(lastCode.replace(/\D/g, '')) || 0;
      newQuickCode = `DF${String(lastCodeNumber + 1).padStart(3, '0')}`;
    } else {
      newQuickCode = 'DF001';
    }

    // Ensure the generated code is unique
    const isUnique = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type,
        quick_code: newQuickCode,
      },
    });

    if (isUnique) {
      return res.status(500).json({ error: 'Generated quick code is not unique. Please try again.' });
    }

    // Insert into quickcode_mst
    const newQuickcodeEntry = await prisma.quickcode_mst.create({
      data: {
        quick_code_type,
        quick_code: newQuickCode,
        quickcode_name: date_format_name,
        language_code: 'en',
        concurrency_val: 1,
        created_by,
        created_date: new Date(),
      },
    });

    res.status(201).json({ quickcode: newQuickcodeEntry });
  } catch (error) {
    console.error('Error creating date format metadata:', error.message);
    res.status(500).json({ error: 'Failed to create date format metadata' });
  } finally {
    await prisma.$disconnect();
  }
};

export const getDateFormatNameandQuickCode = async (req, res) => {
  try {
    // Fetch all entries from date_format_metadata
    const dateFormats = await prisma.date_format_metadata.findMany();

    // Filter and fetch only matching entries from quickcode_mst
    const results = await Promise.all(
      dateFormats.map(async (format) => {
        const quickCodeEntry = await prisma.quickcode_mst.findFirst({
          where: {
            quickcode_name: format.date_format_name, // Match quickcode_name
            quick_code_type: 'datfmt', // Match type
          },
        });

        // Include only matched results
        if (quickCodeEntry) {
          return {
            date_format_name: format.date_format_name,
            quick_code: quickCodeEntry.quick_code,
            quick_code_type: quickCodeEntry.quick_code_type,
            quickcode_name: quickCodeEntry.quickcode_name,
          };
        } else {
          return null; // Exclude non-matching results
        }
      })
    );

    // Filter out null results
    const filteredResults = results.filter((item) => item !== null);

    // Check if there are any matching entries
    if (filteredResults.length === 0) {
      return res.status(404).json({ error: 'No matching date formats found' });
    }

    res.status(200).json(filteredResults);
  } catch (error) {
    console.error('Error fetching date format metadata:', error.message);
    res.status(500).json({ error: 'Failed to fetch date format metadata' });
  } finally {
    await prisma.$disconnect();
  }
};






export const updateDateFormatMetadata = async (req, res) => {
  const { id } = req.params;
  const { date_format_name, updated_by } = req.body;

  try {
    // Check if the entry exists
    const existingEntry = await prisma.date_format_metadata.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: 'Date format metadata not found' });
    }

    // Update the entry
    const updatedDateFormatEntry = await prisma.date_format_metadata.update({
      where: { id: parseInt(id) },
      data: {
        date_format_name,
        updated_by,
        updated_date: new Date(),
      },
    });

    res.json(updatedDateFormatEntry);
  } catch (error) {
    console.error('Error updating date format metadata:', error);
    res.status(500).json({ error: 'Failed to update date format metadata' });
  }
};

export const getDateFormatMetadata = async (req, res) => {
  try {
    const dateFormatMetadata = await prisma.date_format_metadata.findMany({
      select: {
        id: true,
        date_format_name: true,
        date_format_code: true,
        created_by: true,
        created_date: true,
        updated_by: true,
        updated_date: true,
      },
    });

    if (dateFormatMetadata.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    res.json(dateFormatMetadata);
  } catch (error) {
    console.error('Error retrieving date format metadata:', error);
    res.status(500).json({ error: 'Failed to retrieve date format metadata' });
  }
};

export const getDateFormatDetails = async (req, res) => {
    try {
      const dateFormatDetails = await prisma.date_format_metadata.findMany({
        select: {
          date_format_name: true,
          date_format_code: true,
        },
      });
  
      if (dateFormatDetails.length === 0) {
        return res.status(404).json({ message: 'No data found' });
      }
  
      res.json(dateFormatDetails);
    } catch (error) {
      console.error('Error retrieving date format details:', error);
      res.status(500).json({ error: 'Failed to retrieve date format details' });
    }
  };
  
  
export const getDateFormatNames = async (req, res, next) => {
  try {
    const dateFormatNames = await prisma.date_format_metadata.findMany({
      select: {
        date_format_name: true
        
      },
    });

    if (dateFormatNames.length === 0) {
      return next(new HttpException(StatusCodes.NOT_FOUND, 'No data found'));
    }

    res.json(dateFormatNames);
  } catch (error) {
    logger.error('Error in getDateFormatNames:', error.message);
    next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve date format names', error.message));
  } finally {
    await prisma.$disconnect();
  }
};