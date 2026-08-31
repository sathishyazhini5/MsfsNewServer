import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/index.js";
import { provinceScopeWhere, resolveDataScope, sendScopeError } from '../../utils/dataScope.js';

export const saveCommunityHouseDetails = async (req, res) => {
  const {
    division_type_code,
    division_code,
    community_house_name, // Corrected typo here
    language_code = 'en',
    concurrency_val = 1,
  } = req.body;

  const created_date = new Date();
  

  try {
    console.log('Received data:', req.body);

    // Validate `community_house_name`
    if (!community_house_name || community_house_name.trim() === '') {
      return res.status(400).json({ error: 'Community house name is required and cannot be empty' });
    }

    // Validate token and extract user details
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired" });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token" });
      }
      return res.status(500).json({ error: "Failed to verify token" });
    }

    const created_by = decoded.role_name || decoded.username || "Unknown";

    // Fetch `province_code` based on the logged-in user's `province_name`
    const provinceName = decoded.province_name;
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      console.error(`Province not found for province_name: ${provinceName}`);
      return res.status(404).json({ error: "Province not found for the logged-in user" });
    }

    const province_code = province.province_code;

    // Validate division type
    const divisionType = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'divtyp',
          quick_code: division_type_code,
        },
      },
    });

    if (!divisionType) {
      console.error(`Division type code ${division_type_code} not found`);
      return res.status(404).json({ error: `Division type code ${division_type_code} not found` });
    }

    // Validate division
    const division = await prisma.division_setup_mst.findFirst({
      where: {
        division_code,
        division_type_code,
      },
    });

    if (!division) {
      console.error(`Division code ${division_code} not found for division type code ${division_type_code}`);
      return res.status(404).json({ error: `Division code ${division_code} not found for division type code ${division_type_code}` });
    }

    // Check for existing community house with same details
    const existingCommunityHouse = await prisma.community_house_dtl.findFirst({
      where: {
        province_code,
        division_type_code,
        division_code,
        community_house_name: { equals: community_house_name, mode: 'insensitive' }, // Case-insensitive match
      },
    });

    if (existingCommunityHouse) {
      console.error('Community house with these details already exists');
      return res.status(409).json({ error: 'Community house with these details already exists' });
    }

    // Generate community_house_code
    const lastCommunityHouse = await prisma.community_house_dtl.findFirst({
      where: { province_code },
      orderBy: { community_house_code: 'desc' },
    });

    let newCommunityHouseCode = `CH001${province_code}`;
    if (lastCommunityHouse?.community_house_code) {
      const lastCodeMatch = lastCommunityHouse.community_house_code.match(/CH(\d+)/);
      if (lastCodeMatch) {
        const lastCodeNumber = parseInt(lastCodeMatch[1], 10);
        newCommunityHouseCode = `CH${(lastCodeNumber + 1).toString().padStart(3, '0')}${province_code}`;
      }
    }

    // Save community house
    const result = await prisma.community_house_dtl.create({
      data: {
        community_house_code: newCommunityHouseCode,
        province_code,
        division_type_code,
        division_code,
        community_house_name, // Corrected field name here
        language_code,
        concurrency_val,
        created_by,
        created_date,

      },
    });

    console.log('Data saved successfully:', result);
    return res.status(201).json({
      message: 'Data saved successfully',
      data: {
        ...result, // Use the actual saved result
        province_name: province?.province_name || null,
        division_type_name: divisionType?.quickcode_name || null,
        division_name: division?.division_name || null,
      },
    });
    
  } catch (error) {
    console.error('Error saving data:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateCommunityHouseDetails = async (req, res) => {
  const {
    division_type_code,
    division_code,
    community_house_name,
    language_code = "en", // Default value
    concurrency_val = 1, // Default value
    updated_by = "admin", // Default value
  } = req.body;

  const community_house_code = req.params.community_house_code.trim();
  const updated_date = new Date(); // Automatically generate the current date

  try {
    console.log("Received community_house_code:", community_house_code);

    if (!community_house_name || community_house_name.trim() === '') {
      return res.status(400).json({ error: 'Community house name is required and cannot be empty' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Access token has expired" });
      }
      return res.status(401).json({ error: "Invalid token" });
    }

    const updated_by = decoded.role_name || decoded.username || "Unknown";

    console.log("Authenticated user:", decoded);

    // Fetch existing community house details
    const communityHouse = await prisma.community_house_dtl.findFirst({
      where: { community_house_code },
    });

    if (!communityHouse) {
      console.error(`Community house with code ${community_house_code} not found`);
      return res.status(404).json({
        error: `Community house with code ${community_house_code} not found`,
      });
    }

    console.log("Existing Community House fetched:", communityHouse);

    const existingHouseWithSameName = await prisma.community_house_dtl.findFirst({
      where: {
        community_house_name: { equals: community_house_name, mode: "insensitive" }, // Case-insensitive match
        NOT: { community_house_code }, // Exclude the current record
      },
    });

    if (existingHouseWithSameName) {
      return res.status(409).json({
        error: `A community house with the name "${community_house_name}" already exists.`,
      });
    }
    // Prepare update condition and values
    const updatedDivisionTypeCode = division_type_code || communityHouse.division_type_code;
    const updatedDivisionCode = division_code || communityHouse.division_code;

    console.log("Update Condition:", {
      community_house_code,
      province_code: communityHouse.province_code,
      division_type_code: updatedDivisionTypeCode,
      division_code: updatedDivisionCode,
    });

    // Validate if new division_type_code exists
    if (division_type_code) {
      const isValidDivisionType = await prisma.quickcode_mst.findUnique({
        where: {
          quick_code_type_quick_code: {
            quick_code_type: "divtyp",
            quick_code: division_type_code,
          },
        },
      });

      if (!isValidDivisionType) {
        return res.status(400).json({
          error: `Invalid division_type_code: ${division_type_code} does not exist.`,
        });
      }
    }

    // Validate if new division_code exists
    if (division_code) {
      const isValidDivision = await prisma.division_setup_mst.findFirst({
        where: { division_code },
      });

      if (!isValidDivision) {
        return res.status(400).json({
          error: `Invalid division_code: ${division_code} does not exist.`,
        });
      }
    }

    // Update the community_house_dtl record
    const updatedCommunityHouse = await prisma.community_house_dtl.update({
      where: {
        community_house_code_province_code_division_type_code_division_code: {
          community_house_code,
          province_code: communityHouse.province_code,
          division_type_code: communityHouse.division_type_code, // Existing value
          division_code: communityHouse.division_code,          // Existing value
        },
      },
      data: {
        division_type_code: updatedDivisionTypeCode, // New value
        division_code: updatedDivisionCode,         // New value
        community_house_name,
        updated_by,
        updated_date:new Date(),
      },
    });

    console.log("Data updated successfully:", updatedCommunityHouse);

    return res.status(200).json({
      message: "Community house details updated successfully.",
      data: updatedCommunityHouse,
    });
  } catch (error) {
    console.error("Error updating data:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};












export const getCommunityHouseDetails = async (req, res) => {
  try {
    const { provinceCodes } = await resolveDataScope(req, prisma, req.query.province_code || null);
    // Fetch all records from community_house_dtl
    const communityHouses = await prisma.community_house_dtl.findMany({
        where: provinceScopeWhere(provinceCodes)
      });
  
      if (!communityHouses.length) {
        return res.status(200).json({ message: 'No community house details found', data: [] });
      }

    // Fetch related names for each community house using raw SQL
    const communityHouseWithNames = await Promise.all(
      communityHouses.map(async (house) => {
        // Fetch province name using Prisma's findUnique method
        const province = await prisma.province_mst.findUnique({
          where: { province_code: house.province_code },
          select: { province_name: true }
        });

        // Fetch division type name using Prisma's findUnique method
        const divisionType = await prisma.quickcode_mst.findFirst({
          where: {
            quick_code: house.division_type_code,
            quick_code_type: 'divtyp'
          },
          select: { quickcode_name: true }
        });

        // Fetch division name using division_code
        const division = await prisma.division_setup_mst.findFirst({
          where: {
            province_code: house.province_code,
            division_code: house.division_code,  // Use house.division_code
            division_type_code: house.division_type_code // Use house.division_type_code
          },
          select: { division_name: true }
        });

        // Return the community house details along with the fetched names
        return {
          ...house,
          province_name: province?.province_name || null,
          division_type_name: divisionType?.quickcode_name || null,
          division_name: division?.division_name || null,  // Fetching division_name based on division_code
          commutity_house_name: house.community_house_name,
          language_code: house.language_code,
          created_by: house.created_by,
          created_date: house.created_date,
          updated_by: house.updated_by,
          updated_date: house.updated_date,
        };
      })
    );

    communityHouseWithNames.sort((a, b) => a.commutity_house_name.localeCompare(b.commutity_house_name));
    // console.log('Fetched all community house details successfully:', communityHouseWithNames);
    return res.status(200).json({ message: 'Fetched all community house details successfully', data: communityHouseWithNames });
  } catch (error) {
    console.error('Error fetching community house details:', error.message);
    return sendScopeError(res, error, 'Internal Server Error');
  }
};


export const getCommunityHouseDetailsByCode = async (req, res) => {
  const { community_house_code } = req.params;

  try {
    const trimmedCommunityHouseCode = community_house_code.trim();
    console.log("Fetching Community House for Code:", trimmedCommunityHouseCode);

    const communityHouseDetail = await prisma.$queryRaw`
      SELECT 
          ch.community_house_code,
          ch.province_code,
          p.province_name, -- Correctly fetch the province name
          ch.division_type_code,
          q.quickcode_name AS division_type_name,
          ch.division_code,
          d.division_name,
          ch.community_house_name, -- Correctly fetch community house name
          ch.language_code,
          ch.concurrency_val,
          ch.created_by,
          ch.created_date,
          ch.updated_by,
          ch.updated_date
      FROM 
          community_house_dtl ch
      LEFT JOIN 
          province_mst p ON ch.province_code = p.province_code
      LEFT JOIN 
          quickcode_mst q ON ch.division_type_code = q.quick_code
          AND q.quick_code_type = 'divtyp'
      LEFT JOIN 
          division_setup_mst d ON ch.division_code = d.division_code 
          AND ch.division_type_code = d.division_type_code
          AND ch.province_code = d.province_code
      WHERE 
          LOWER(ch.community_house_code) = LOWER(${trimmedCommunityHouseCode})
    `;

    if (!communityHouseDetail || communityHouseDetail.length === 0) {
      return res.status(404).json({ 
        error: `No details found for community_house_code ${community_house_code}.` 
      });
    }

    console.log("Community House Details:", communityHouseDetail[0]);

    return res.status(200).json({
      message: 'Community house details retrieved successfully',
      data: communityHouseDetail[0], // Ensure the correct data is sent
    });
  } catch (error) {
    console.error(`Error fetching details for community_house_code ${community_house_code}:`, error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};




export const deleteCommunityHouseDetails = async (req, res) => {
  const { community_house_code } = req.params;

  try {
    const trimmedCode = community_house_code.trim(); // Trim spaces
    console.log("Trimmed community_house_code:", trimmedCode);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Access token has expired" });
      }
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log("Authenticated user:", decoded);
    console.log("Received data for deletion:", { community_house_code: trimmedCode });

    // Fetch existing community house details
    const existingCommunityHouse = await prisma.community_house_dtl.findFirst({
      where: { community_house_code: trimmedCode },
    });

    console.log("Existing Community House:", existingCommunityHouse);

    if (!existingCommunityHouse) {
      console.error(`Community house with code ${trimmedCode} not found`);
      return res.status(404).json({
        error: `Community house with code ${trimmedCode} not found`,
      });
    }

    // Check for dependencies
    const dependencies = await Promise.all([
      (await prisma.centre_dtl.findFirst({ where: { community_house_code: trimmedCode } })) ? "centre_dtl" : null,
    ]);

    const foundDependencies = dependencies.filter((dep) => dep !== null);

    if (foundDependencies.length > 0) {
      console.info(`Dependency found for community_house_code: ${trimmedCode} in the following tables: ${foundDependencies.join(", ")}`);
      return res.status(400).json({
        error: `Cannot delete: community_house_code is referenced in other tables (${foundDependencies.join(", ")}).`,
      });
    }

    // Delete the community house detail
    const result = await prisma.community_house_dtl.delete({
      where: {
        community_house_code_province_code_division_type_code_division_code: {
          community_house_code: existingCommunityHouse.community_house_code,
          province_code: existingCommunityHouse.province_code,
          division_type_code: existingCommunityHouse.division_type_code,
          division_code: existingCommunityHouse.division_code,
        },
      },
    });

    console.log("Data deleted successfully:", result);
    return res.status(200).json({ message: "Data deleted successfully", data: result });
  } catch (error) {
    console.error("Error deleting data:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

