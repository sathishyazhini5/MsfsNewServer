import { PrismaClient } from '@prisma/client';
import { JWT_SECRET } from "../../config/index.js";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// export const createQuickCode = async (req, res) => {
//   const { quick_code_type, language_code, quickcode_name } = req.body;

//   // Ensure the quick_code_type is 'deptyp' only
//   if (quick_code_type !== 'deptyp') {
//     return res.status(400).json({ error: 'quick_code_type must be deptyp' });
//   }

//   try {
//     // Extract token from headers
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Access token is missing or invalid" });
//     }
//     const token = authHeader.split(" ")[1];

//     // Verify and decode the token
//     let decoded;
//     try {
//       decoded = jwt.verify(token, JWT_SECRET);
//     } catch (error) {
//       if (error.name === "TokenExpiredError") {
//         return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Token has expired" });
//       }
//       if (error.name === "JsonWebTokenError") {
//         return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid token" });
//       }
//       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to verify token" });
//     }

//     // Extract province_name and created_by (role_name) from the decoded token
//     const provinceName = decoded.province_name;
//     const createdBy = decoded.role_name || decoded.username || 'Unknown'; // Set default if not available

//     // Find the corresponding province_code based on province_name
//     const province = await prisma.province_mst.findFirst({
//       where: { province_name: provinceName },
//       select: { province_code: true },
//     });

//     if (!province) {
//       return res.status(StatusCodes.NOT_FOUND).json({ error: "Province not found for the logged-in user" });
//     }
//     const provinceCode = province.province_code;

//     // Validate meta_code in meta_data_mst
//     const metaCodeEntry = await prisma.meta_data_mst.findFirst({
//       where: {
//         screen_code: 'qckcode',
//         meta_code: quick_code_type,
//       },
//     });

//     if (!metaCodeEntry) {
//       return res.status(400).json({ error: 'Invalid quick_code_type' });
//     }

//     // Normalize quickcode_name for duplicate check (trim and convert to lowercase)
//     const normalizedQuickcodeName = quickcode_name.trim().toLowerCase();

//     // Check for duplicate quickcode_name (normalized)
//     const duplicateEntry = await prisma.quickcode_mst.findFirst({
//       where: {
//         quick_code_type,
//         quickcode_name: {
//           equals: normalizedQuickcodeName,
//           mode: "insensitive" // Case-insensitive match
//         },
//       },
//     });

//     if (duplicateEntry) {
//       return res.status(400).json({ error: `Departure name '${quickcode_name}' already exists.` });
//     }

//     // Generate a new quick code
//     const existingCodes = await prisma.quickcode_mst.findMany({
//       where: { quick_code_type },
//       orderBy: { quick_code: 'desc' },
//       take: 1,
//     });

//     let newQuickCode = 'D001';
//     if (existingCodes.length > 0) {
//       const lastCode = existingCodes[0].quick_code;
//       const lastCodeNumber = parseInt(lastCode.slice(1)) + 1;
//       newQuickCode = 'D' + String(lastCodeNumber).padStart(3, '0');
//     }

//     // Create new quick code entry with normalized quickcode_name, province_code, and created_by from token
//     const newQuickCodeEntry = await prisma.quickcode_mst.create({
//       data: {
//         province_code: provinceCode,
//         quick_code_type,
//         quick_code: newQuickCode,
//         language_code,
//         quickcode_name: normalizedQuickcodeName, // Save as normalized name
//         concurrency_val: 1,
//         created_by: createdBy, // Set created_by from token
//         created_date: new Date(),
//       },
//     });

//     res.json(newQuickCodeEntry);
//   } catch (error) {
//     console.error('Error creating quick code:', error);
//     res.status(500).json({ error: 'Failed to create quick code' });
//   } finally {
//     await prisma.$disconnect();
//   }
// };

// export const createQuickCode = async (req, res) => {
//   const { quick_code_type, language_code, quickcode_name } = req.body;

//   // List of allowed quick_code_type values
//   const allowedQuickCodeTypes = [
//     'bldgrp', 'natlty', 'deptyp', 'schtyp', 'destyp', 'lancod', 'apostl',
//     'ctrtyp', 'divtyp', 'usrtyp', 'memtyp', 'pcicof', 'mandat', 'fortyp',
//     'promto', 'yrform', 'anityp', 'diocse', 'fedtyp','rolnam'
//   ];

//   // Validate quick_code_type
//   if (!allowedQuickCodeTypes.includes(quick_code_type)) {
//     return res.status(400).json({ error: 'Invalid quick_code_type' });
//   }

//   try {
//     // Extract token from headers
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Access token is missing or invalid" });
//     }
//     const token = authHeader.split(" ")[1];

//     // Verify and decode the token
//     let decoded;
//     try {
//       decoded = jwt.verify(token, JWT_SECRET);
//     } catch (error) {
//       if (error.name === "TokenExpiredError") {
//         return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Token has expired" });
//       }
//       if (error.name === "JsonWebTokenError") {
//         return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid token" });
//       }
//       return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to verify token" });
//     }

//     // Extract province_name and created_by from the token
//     const provinceName = decoded.province_name;
//     const createdBy = decoded.role_name || decoded.username || 'Unknown';

//     // Find the corresponding province_code based on province_name
//     const province = await prisma.province_mst.findFirst({
//       where: { province_name: provinceName },
//       select: { province_code: true },
//     });

//     if (!province) {
//       return res.status(StatusCodes.NOT_FOUND).json({ error: "Province not found for the logged-in user" });
//     }
//     const provinceCode = province.province_code;

//     // Validate meta_code in meta_data_mst
//     const metaCodeEntry = await prisma.meta_data_mst.findFirst({
//       where: {
//         screen_code: 'qckcode',
//         meta_code: quick_code_type,
//       },
//     });

//     if (!metaCodeEntry) {
//       return res.status(400).json({ error: 'Invalid quick_code_type' });
//     }

//     // Normalize quickcode_name for duplicate check (trim and convert to lowercase)
//     const normalizedQuickcodeName = quickcode_name.trim().toLowerCase();

//     // Check for duplicate quickcode_name within the same quick_code_type and province_code
//     const duplicateEntry = await prisma.quickcode_mst.findFirst({
//       where: {
//         quick_code_type,
//         province_code: provinceCode, // Match the province
//         quickcode_name: {
//           equals: normalizedQuickcodeName,
//           mode: "insensitive", // Case-insensitive match
//         },
//       },
//     });

//     if (duplicateEntry) {
//       return res.status(400).json({
//         error: `Name '${quickcode_name}' already exists for the type '${quick_code_type}' in the province '${provinceName}'.`,
//       });
//     }

//     // Generate a new quick code
//     const existingCodes = await prisma.quickcode_mst.findMany({
//       where: { quick_code_type },
//       orderBy: { quick_code: 'desc' },
//       take: 1,
//     });

//     let newQuickCode = 'D001';
//     if (existingCodes.length > 0) {
//       const lastCode = existingCodes[0].quick_code;
//       const lastCodeNumber = parseInt(lastCode.slice(1)) + 1;
//       newQuickCode = 'D' + String(lastCodeNumber).padStart(3, '0');
//     }

//     // Create new quick code entry with province_code, created_by, and normalized quickcode_name
//     const newQuickCodeEntry = await prisma.quickcode_mst.create({
//       data: {
//         province_code: provinceCode,
//         quick_code_type,
//         quick_code: newQuickCode,
//         language_code,
//         quickcode_name: normalizedQuickcodeName,
//         concurrency_val: 1,
//         created_by: createdBy,
//         created_date: new Date(),
//       },
//     });

//     res.json(newQuickCodeEntry);
//   } catch (error) {
//     console.error('Error creating quick code:', error);
//     res.status(500).json({ error: 'Failed to create quick code' });
//   } finally {
//     await prisma.$disconnect();
//   }
// };

export const createQuickCode = async (req, res) => {
  const { quick_code_type, language_code, quickcode_name } = req.body;

  // List of allowed quick_code_type values
  const allowedQuickCodeTypes = [
    'bldgrp', 'natlty', 'deptyp', 'schtyp', 'destyp', 'lancod', 'apostl',
    'ctrtyp', 'divtyp', 'usrtyp', 'memtyp', 'pcicof', 'mandat', 'fortyp',
    'promto', 'yrform', 'anityp', 'diocse', 'fedtyp', 'rolnam','datefmt'
  ];

  // Validate quick_code_type
  if (!allowedQuickCodeTypes.includes(quick_code_type)) {
    return res.status(400).json({ error: 'Invalid quick_code_type' });
  }

  try {
    // Extract token from headers
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

    // Extract province_name and created_by from the token
    const provinceName = decoded.province_name;
    const createdBy = decoded.role_name || decoded.username || 'Unknown';

    // Find the corresponding province_code based on province_name
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the logged-in user" });
    }
    const provinceCode = province.province_code;

    // Normalize quickcode_name for duplicate check (trim and convert to lowercase)
    // const normalizedQuickcodeName = quickcode_name.trim().toLowerCase();

    // Check for duplicate quickcode_name within the same quick_code_type and province_code
    const duplicateEntry = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type,
        province_code: provinceCode,
        quickcode_name: {
          equals: quickcode_name,
          mode: "insensitive",
        },
      },
    });

    if (duplicateEntry) {
      return res.status(400).json({
        error: `Name '${quickcode_name}' already exists for the type '${quick_code_type}' in the province '${provinceName}'.`,
      });
    }

    // Generate a prefix dynamically based on the quick_code_type
    const prefix = quick_code_type.slice(0, 3).toLowerCase(); // Take the first 3 letters of the quick_code_type

    // Generate a new quick code
    const existingCodes = await prisma.quickcode_mst.findMany({
      where: { quick_code_type },
      orderBy: { quick_code: 'desc' },
      take: 1,
    });

    let newQuickCode = `${prefix}001`;
    if (existingCodes.length > 0) {
      const lastCode = existingCodes[0].quick_code;
      const lastCodeNumber = parseInt(lastCode.slice(3)) + 1; // Increment the numeric part
      newQuickCode = `${prefix}${String(lastCodeNumber).padStart(3, '0')}`;
    }

    // Create new quick code entry with province_code, created_by, and normalized quickcode_name
    const newQuickCodeEntry = await prisma.quickcode_mst.create({
      data: {
        province_code: provinceCode,
        quick_code_type,
        quick_code: newQuickCode,
        language_code,
        quickcode_name,
        concurrency_val: 1,
        created_by: createdBy,
        created_date: new Date(),
      },
    });

    res.json(newQuickCodeEntry);
  } catch (error) {
    console.error('Error creating quick code:', error);
    res.status(500).json({ error: 'Failed to create quick code' });
  } finally {
    await prisma.$disconnect();
  }
};


export const getQuickCodeNames = async (req, res) => {
  const { quick_code_type } = req.query;

  // List of allowed quick_code_type values
  const allowedQuickCodeTypes = [
    'bldgrp', 'natlty', 'deptyp', 'schtyp', 'destyp', 'lancod', 'apostl',
    'ctrtyp', 'divtyp', 'usrtyp', 'memtyp', 'pcicof', 'mandat', 'fortyp',
    'promto', 'yrform', 'anityp', 'diocse', 'fedtyp','datefmt'
  ];

  try {
    // Ensure token is present
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Access token is missing or invalid" });
    }
    const token = authHeader.split(" ")[1];

    // Verify and decode the token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Token has expired" });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid token" });
      }
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to verify token" });
    }

    // Extract province_code and province_name from the decoded token
    const provinceName = decoded.province_name;
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "Province not found for the logged-in user" });
    }
    const provinceCode = province.province_code;

    // Validate quick_code_type
    if (quick_code_type && !allowedQuickCodeTypes.includes(quick_code_type)) {
      return res.status(400).json({ error: 'Invalid quick_code_type' });
    }

    // Fetch quick codes filtered by quick_code_type and province_code
    const quickCodeNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: quick_code_type || undefined, // Optional filtering by quick_code_type
        province_code: provinceCode,
      },
      select: {
        quickcode_name: true,
        quick_code: true,
        quick_code_type: true,
        province_code: true,
      },
      orderBy: {
        quickcode_name: "asc", // Change this if another field defines the order
      },
    });

    res.json(quickCodeNames);
  } catch (error) {
    console.error('Error retrieving quick code names:', error);
    res.status(500).json({ error: 'Failed to retrieve quick code names' });
  } finally {
    await prisma.$disconnect();
  }
};

// export const updateQuickCode = async (req, res) => {
//   const { quick_code_type, quick_code, quickcode_name } = req.body;

//   console.log('Request Body:', req.body);

//   // Validate required fields
//   if (!quick_code_type || !quick_code || !quickcode_name) {
//     console.error('Missing required fields', { quick_code_type, quick_code, quickcode_name });
//     return res.status(400).json({ error: 'Missing required fields' });
//   }

//   // Extract and verify token for user information
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'Access token is missing or invalid' });
//   }
//   const token = authHeader.split(' ')[1];

//   let decoded;
//   try {
//     decoded = jwt.verify(token, JWT_SECRET);
//   } catch (error) {
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }

//   // Extract the user's identity for `updated_by`
//   const updatedBy = decoded.role_name || decoded.username || 'Unknown'; // Default to 'Unknown' if not present

//   try {
//     // Check if the quick code exists
//     const existingQuickCode = await prisma.quickcode_mst.findUnique({
//       where: {
//         quick_code_type_quick_code: {
//           quick_code_type,
//           quick_code,
//         },
//       },
//     });

//     if (!existingQuickCode) {
//       console.error('Quick code not found', { quick_code_type, quick_code });
//       return res.status(404).json({ error: 'Quick code not found' });
//     }

//     // Check for duplicate quickcode_name within the same type, ignoring the current quick_code
//     const duplicateQuickCode = await prisma.quickcode_mst.findFirst({
//       where: {
//         quick_code_type,
//         quickcode_name: {
//           equals: quickcode_name.trim(),
//           mode: 'insensitive',
//         },
//         quick_code: {
//           not: quick_code,
//         },
//       },
//     });

//     if (duplicateQuickCode) {
//       console.error('Duplicate quickcode_name for the provided quick_code_type', { quick_code_type, quickcode_name });
//       return res.status(400).json({ error: 'Duplicate quickcode_name for the provided quick_code_type' });
//     }

//     // Update the quickcode_name with `updated_by` from the token
//     const updatedQuickCodeEntry = await prisma.quickcode_mst.update({
//       where: {
//         quick_code_type_quick_code: {
//           quick_code_type,
//           quick_code,
//         },
//       },
//       data: {
//         quickcode_name: quickcode_name.trim(), // Trim any extra spaces
//         updated_by: updatedBy, // Set updated_by from token
//         updated_date: new Date(),
//       },
//     });

//     console.log('Updated quick code entry:', updatedQuickCodeEntry);
//     res.json(updatedQuickCodeEntry);
//   } catch (error) {
//     console.error('Error updating quick code name:', error);
//     res.status(500).json({ error: 'Failed to update quick code name', details: error.message });
//   }
// };




// export const deleteQuickCode = async (req, res) => {
//   const { quick_code_type, quick_code } = req.body;

//   try {
//     // Check if the entry exists
//     const existingEntry = await prisma.quickcode_mst.findUnique({
//       where: {
//         quick_code_type_quick_code: {
//           quick_code_type,
//           quick_code,
//         },
//       },
//     });

//     if (!existingEntry) {
//       return res.status(404).json({ error: 'Quick code entry not found' });
//     }

//     // Delete the entry
//     await prisma.quickcode_mst.delete({
//       where: {
//         quick_code_type_quick_code: {
//           quick_code_type,
//           quick_code,
//         },
//       },
//     });

//     res.json({ message: 'Quick code entry deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting quick code:', error);
//     res.status(500).json({ error: 'Failed to delete quick code' });
//   }
// };

// export const updateQuickCode = async (req, res) => {
//   const { quick_code_type, quick_code, quickcode_name } = req.body;

//   console.log('Request Body:', req.body);

//   // Validate required fields
//   if (!quick_code_type || !quick_code || !quickcode_name) {
//     console.error('Missing required fields', { quick_code_type, quick_code, quickcode_name });
//     return res.status(400).json({ error: 'Missing required fields' });
//   }

//   // Extract and verify token for user information
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'Access token is missing or invalid' });
//   }
//   const token = authHeader.split(' ')[1];

//   let decoded;
//   try {
//     decoded = jwt.verify(token, JWT_SECRET);
//   } catch (error) {
//     return res.status(401).json({ error: 'Invalid or expired token' });
//   }

//   // Extract the user's identity for `updated_by`
//   const updatedBy = decoded.role_name || decoded.username || 'Unknown';

//   try {
//     // Check if the quick code exists
//     const existingQuickCode = await prisma.quickcode_mst.findUnique({
//       where: {
//         quick_code_type_quick_code: {
//           quick_code_type,
//           quick_code,
//         },
//       },
//     });

//     if (!existingQuickCode) {
//       console.error('Quick code not found', { quick_code_type, quick_code });
//       return res.status(404).json({ error: 'Quick code not found' });
//     }

//     // Check for duplicate quickcode_name within the same type, ignoring the current quick_code
//     const duplicateQuickCode = await prisma.quickcode_mst.findFirst({
//       where: {
//         quick_code_type,
//         quickcode_name: {
//           equals: quickcode_name,
//           mode: 'insensitive', // Case-insensitive comparison
//         },
//         NOT: {
//           quick_code,
//         },
//       },
//     });

//     if (duplicateQuickCode) {
//       console.error('Duplicate quickcode_name for the provided quick_code_type', { quick_code_type, quickcode_name });
//       return res.status(400).json({ error: 'Quickcode name already exists' });
//     }

//     // Update the quickcode_name with `updated_by` from the token
//     const updatedQuickCodeEntry = await prisma.quickcode_mst.update({
//       where: {
//         quick_code_type_quick_code: {
//           quick_code_type,
//           quick_code,
//         },
//       },
//       data: {
//         quickcode_name,
//         updated_by: updatedBy, // Set `updated_by` from token
//         updated_date: new Date(),
//       },
//     });

//     console.log('Updated quick code entry:', updatedQuickCodeEntry);
//     res.json(updatedQuickCodeEntry);
//   } catch (error) {
//     console.error('Error updating quick code name:', error.message);
//     return res.status(500).json({ error: 'Network error or server not responding' });
//   }
// };

export const updateQuickCode = async (req, res) => {
  const { quick_code_type, quick_code, quickcode_name } = req.body;

  console.log('Request Body:', req.body);

  // Validate required fields
  if (!quick_code_type || !quick_code || !quickcode_name) {
    console.error('Missing required fields', { quick_code_type, quick_code, quickcode_name });
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Extract and verify token for user information
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access token is missing or invalid' });
  }
  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Extract the user's province code and identity
  const provinceName = decoded.province_name;
  const updatedBy = decoded.role_name || decoded.username || 'Unknown';

  const province = await prisma.province_mst.findFirst({
    where: { province_name: provinceName },
    select: { province_code: true },
  });

  if (!province) {
    return res.status(404).json({ error: 'Province not found for the logged-in user' });
  }
  const provinceCode = province.province_code;

  try {
    // Check if the quick code exists for the current province
    const existingQuickCode = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type,
        quick_code,
        province_code: provinceCode,
      },
    });

    if (!existingQuickCode) {
      console.error('Quick code not found', { quick_code_type, quick_code, provinceCode });
      return res.status(404).json({ error: 'Quick code not found in the user’s province' });
    }

    // Check for duplicate quickcode_name within the same quick_code_type and province
    const duplicateQuickCode = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type,
        province_code: provinceCode,
        quickcode_name: {
          equals: quickcode_name,
          mode: 'insensitive',
        },
        NOT: { quick_code },
      },
    });

    if (duplicateQuickCode) {
      console.error('Duplicate quickcode_name for the provided quick_code_type and province', { quick_code_type, quickcode_name });
      return res.status(400).json({ error: 'Quickcode name already exists in the province' });
    }

    // Update the quickcode_name
    const updatedQuickCodeEntry = await prisma.quickcode_mst.updateMany({
      where: {
        quick_code_type,
        quick_code,
        province_code: provinceCode,
      },
      data: {
        quickcode_name,
        updated_by: updatedBy,
        updated_date: new Date(),
      },
    });

    if (updatedQuickCodeEntry.count === 0) {
      return res.status(404).json({ error: 'No matching quick code found for update.' });
    }

    res.json({ message: 'Quick code updated successfully.' });
  } catch (error) {
    console.error('Error updating quick code:', error.message);
    return res.status(500).json({ error: 'Failed to update quick code.' });
  }
};




// export const deleteQuickCode = async (req, res) => {
//   const { quick_code_type, quick_code } = req.body;

//   try {
//     // Check if the entry exists
//     const existingEntry = await prisma.quickcode_mst.findUnique({
//       where: {
//         quick_code_type_quick_code: {
//           quick_code_type,
//           quick_code,
//         },
//       },
//     });

//     if (!existingEntry) {
//       return res.status(404).json({ error: 'Quick code entry not found' });
//     }

//     // Dependency checks with logging for each table
//     const dependencies = await Promise.all([
//       (await prisma.centre_dtl.findFirst({ where: { centre_type_code: quick_code } })) ? "centre_dtl" : null,
//       (await prisma.apostolates_mst.findFirst({ where: { centre_type_code: quick_code } })) ? "apostolates_mst" : null,
//       (await prisma.centre_dtl.findFirst({ where: { apostolate_code: quick_code } })) ? "centre_dtl" : null,
//       (await prisma.apostolates_mst.findFirst({ where: { apostolate_code: quick_code } })) ? "apostolates_mst" : null,
//       (await prisma.announcements_dtl.findFirst({ where: { apostolate_code: quick_code } })) ? "announcements_dtl" : null,
//       (await prisma.curia_advisors_dtl.findFirst({ where: { designation_code: quick_code } })) ? "curia_advisors_dtl" : null,
//       (await prisma.confreres_dtl.findFirst({ where: { nationality_code: quick_code } })) ? "confreres_dtl" : null,
//       (await prisma.confreres_feedback_dtl.findFirst({ where: { designation_code: quick_code } })) ? "confreres_feedback_dtl" : null,
//       (await prisma.appoint_transfer_dtl.findFirst({ where: { designation_code: quick_code } })) ? "appoint_transfer_dtl" : null,
//       (await prisma.announcements_dtl.findFirst({ where: { designation_code: quick_code } })) ? "announcements_dtl" : null,
//       (await prisma.scholastics_dtl.findFirst({ where: { nationality_code: quick_code } })) ? "scholastics_dtl" : null,
//       (await prisma.scholastics_admisn_promon_dtl.findFirst({ where: { scholastic_type_code: quick_code } })) ? "scholastics_admisn_promon_dtl" : null,
//       (await prisma.departures_dtl.findFirst({ where: { departure_type_code: quick_code } })) ? "departures_dtl" : null,
//       (await prisma.division_setup_mst.findFirst({ where: { division_type_code: quick_code } })) ? "division_setup_mst" : null,
//       (await prisma.headquarters_dtl.findFirst({ where: { division_type_code: quick_code } })) ? "headquarters_dtl" : null,
//       (await prisma.community_house_dtl.findFirst({ where: { division_type_code: quick_code } })) ? "community_house_dtl" : null,
//       (await prisma.centre_dtl.findFirst({ where: { division_type_code: quick_code } })) ? "centre_dtl " : null,
//       (await prisma.curia_advisors_dtl.findFirst({ where: { division_type_code: quick_code } })) ? "curia_advisors_dtl " : null,
//       (await prisma.appoint_transfer_dtl.findFirst({ where: { division_type_code: quick_code } })) ? "appoint_transfer_dtl" : null,
//       (await prisma.scholastics_admisn_promon_dtl.findFirst({ where: { division_type_code: quick_code } })) ? "scholastics_admisn_promon_dtl " : null,
//       (await prisma.announcements_dtl.findFirst({ where: { division_type_code: quick_code } })) ? "announcements_dtl" : null,
//       (await prisma.confreres_dtl.findFirst({ where: { member_type_code: quick_code } })) ? "confreres_dtl " : null,
//       (await prisma.departures_dtl.findFirst({ where: { member_type_code: quick_code } })) ? "departures_dtl " : null,
//       (await prisma.announcements_dtl.findFirst({ where: { member_type_code: quick_code } })) ? "announcements_dtl " : null,
//       (await prisma.obituary_dtl.findFirst({ where: { member_type_code: quick_code } })) ? "obituary_dtl" : null,
//       (await prisma.curia_advisors_dtl.findFirst({ where: { pcic_off_code: quick_code } })) ? "curia_advisors_dtl" : null,
//       (await prisma.curia_advisors_dtl.findFirst({ where: { mandate_code: quick_code } })) ? "curia_advisors_dtl" : null,
//       (await prisma.scholastics_admisn_promon_dtl.findFirst({ where: { formation_type_code: quick_code } })) ? "scholastics_admisn_promon_dtl" : null,
//       (await prisma.scholastics_admisn_promon_dtl.findFirst({ where: { promotion_to_code: quick_code } })) ? "scholastics_admisn_promon_dtl" : null,
//       (await prisma.scholastics_admisn_promon_dtl.findFirst({ where: { year_formation_code: quick_code } })) ? "scholastics_admisn_promon_dtl" : null,
//       (await prisma.anniversary_notify_dtl.findFirst({ where: { anniversary_type_code: quick_code } })) ? "anniversary_notify_dtl" : null,
//       (await prisma.centre_dtl.findFirst({ where: { diocese_code: quick_code } })) ? "centre_dtl" : null,
//       (await prisma.confreres_feedback_dtl.findFirst({ where: { feedback_type_code: quick_code } })) ? "confreres_feedback_dtl" : null,

//     ]);

//     const foundDependencies = dependencies.filter(dep => dep !== null);

//     if (foundDependencies.length > 0) {
//       console.info(`Dependency found for quick_code: ${ quick_code } in the following tables: ${ foundDependencies.join(", ") }`);
//       return res.status(400).json({ error:`Cannot delete: Quick code is referenced in other tables(${ foundDependencies.join(", ") }).`});
//   }

//     // Delete the entry
//     await prisma.quickcode_mst.delete({
//     where: {
//       quick_code_type_quick_code: {
//         quick_code_type,
//         quick_code,
//       },
//     },
//   });

//   res.json({ message: 'Quick code entry deleted successfully' });
// } catch (error) {
//   console.error('Error deleting quick code:', error);
//   res.status(500).json({ error: 'Failed to delete quick code' });
// }
// };

import { Prisma } from '@prisma/client';

export const deleteQuickCode = async (req, res) => {
  const { quick_code_type, quick_code } = req.body;

  try {
    // Check if the entry exists
    const existingEntry = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type,
          quick_code,
        },
      },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: 'Quick code entry not found' });
    }

    // Dependency checks with logging for each table
    const dependencies = await Promise.allSettled([
      prisma.centre_dtl.findFirst({ where: { centre_type_code: quick_code } }),
      prisma.apostolates_mst.findFirst({ where: { centre_type_code: quick_code } }),
      prisma.centre_dtl.findFirst({ where: { apostolate_code: quick_code } }),
      prisma.apostolates_mst.findFirst({ where: { apostolate_code: quick_code } }),
      prisma.announcements_dtl.findFirst({ where: { apostolate_code: quick_code } }),
      prisma.curia_advisors_dtl.findFirst({ where: { designation_code: quick_code } }),
      prisma.confreres_dtl.findFirst({ where: { nationality_code: quick_code } }),
      prisma.confreres_feedback_dtl.findFirst({ where: { designation_code: quick_code } }),
      prisma.appoint_transfer_dtl.findFirst({ where: { designation_code: quick_code } }),
      prisma.announcements_dtl.findFirst({ where: { designation_code: quick_code } }),
      prisma.scholastics_dtl.findFirst({ where: { nationality_code: quick_code } }),
      prisma.scholastics_admisn_promon_dtl.findFirst({ where: { scholastic_type_code: quick_code } }),
      prisma.departures_dtl.findFirst({ where: { departure_type_code: quick_code } }),
      prisma.division_setup_mst.findFirst({ where: { division_type_code: quick_code } }),
      prisma.headquarters_dtl.findFirst({ where: { division_type_code: quick_code } }),
      prisma.community_house_dtl.findFirst({ where: { division_type_code: quick_code } }),
      prisma.centre_dtl.findFirst({ where: { division_type_code: quick_code } }),
      prisma.curia_advisors_dtl.findFirst({ where: { division_type_code: quick_code } }),
      prisma.appoint_transfer_dtl.findFirst({ where: { division_type_code: quick_code } }),
      prisma.scholastics_admisn_promon_dtl.findFirst({ where: { division_type_code: quick_code } }),
      prisma.announcements_dtl.findFirst({ where: { division_type_code: quick_code } }),
      prisma.confreres_dtl.findFirst({ where: { member_type_code: quick_code } }),
      prisma.departures_dtl.findFirst({ where: { member_type_code: quick_code } }),
      prisma.announcements_dtl.findFirst({ where: { member_type_code: quick_code } }),
      prisma.obituary_dtl.findFirst({ where: { member_type_code: quick_code } }),
      prisma.curia_advisors_dtl.findFirst({ where: { pcic_off_code: quick_code } }),
      prisma.curia_advisors_dtl.findFirst({ where: { mandate_code: quick_code } }),
      prisma.scholastics_admisn_promon_dtl.findFirst({ where: { formation_type_code: quick_code } }),
      prisma.scholastics_admisn_promon_dtl.findFirst({ where: { promotion_to_code: quick_code } }),
      prisma.scholastics_admisn_promon_dtl.findFirst({ where: { year_formation_code: quick_code } }),
      prisma.anniversary_notify_dtl.findFirst({ where: { anniversary_type_code: quick_code } }),
      prisma.centre_dtl.findFirst({ where: { diocese_code: quick_code } }),
      prisma.confreres_feedback_dtl.findFirst({ where: { feedback_type_code: quick_code } }),
    ]);

    const foundDependencies = dependencies
      .filter(dep => dep.status === 'fulfilled' && dep.value)
      .map((_, index) => [
        'centre_dtl',
        'apostolates_mst',
        'announcements_dtl',
        'curia_advisors_dtl',
        'confreres_dtl',
        'appoint_transfer_dtl',
        'scholastics_dtl',
        'departures_dtl',
        'division_setup_mst',
        'headquarters_dtl',
        'community_house_dtl',
        'obituary_dtl',
        'anniversary_notify_dtl',
      ][index]);

    if (foundDependencies.length > 0) {
      console.info(`Dependency found for quick_code: ${quick_code} in the following tables: ${foundDependencies.join(", ")}`);
      return res.status(400).json({
        error: `Cannot delete: Quick code is referenced in other tables (${foundDependencies.join(", ")}).`,
      });
    }

    // Delete the quickcode
    await prisma.quickcode_mst.delete({
      where: {
        quick_code_type_quick_code: {
          quick_code_type,
          quick_code,
        },
      },
    });

    res.json({ message: 'Quick code entry deleted successfully' });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('PrismaClientKnownRequestError:', {
        code: error.code,
        message: error.message,
        meta: error.meta,
      });
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error('PrismaClientValidationError:', error.message);
    } else {
      console.error('Unhandled Error:', error);
    }

    res.status(500).json({ error: 'Failed to delete quick code' });
  }
};



