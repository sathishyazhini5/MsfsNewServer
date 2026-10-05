
import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import fs from 'fs';
import { JWT_SECRET } from "../../config/index.js";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { format } from 'date-fns';
import { log } from 'console';
import { provinceScopeWhere, resolveDataScope, sendScopeError } from '../../utils/dataScope.js';
import { estatusRecordWhere } from '../../utils/estatusAccess.js';

const prisma = new PrismaClient();

const generateNextObituaryCode = async () => {
  const lastRecord = await prisma.obituary_dtl.findFirst({
    orderBy: {
      created_date: 'desc',
    },
    select: {
      obituary_code: true,
    },
  });

  let nextObituaryCode = 1;
  if (lastRecord && lastRecord.obituary_code) {
    const lastCodeNumber = parseInt(lastRecord.obituary_code.replace('OBC', ''), 10);
    nextObituaryCode = lastCodeNumber + 1;
  }

  return `OBC${String(nextObituaryCode).padStart(3, '0')}`;  // Return as 'OBC001', 'OBC002', etc.
};

async function fetchCodeByNameOrCode(nameOrCode, type) {
  let whereCondition = {};
  let result;

  switch (type) {
    case 'province':
      whereCondition = {
        OR: [
          { province_name: { equals: nameOrCode, mode: 'insensitive' } },
          { province_code: nameOrCode }
        ],
      };
      result = await prisma.province_mst.findFirst({ where: whereCondition });

      if (!result) {
        throw new Error(`Province name or code ${nameOrCode} not found`);
      }

      return { province_code: result.province_code, country_code: result.country_code };

    case 'memberType':
      whereCondition = {
        OR: [
          { quickcode_name: nameOrCode, quick_code_type: 'memtyp' },
          { quick_code: nameOrCode }
        ],
      };
      result = await prisma.quickcode_mst.findFirst({ where: whereCondition });

      if (!result) {
        throw new Error(`Member type name or code ${nameOrCode} not found`);
      }

      return result.quick_code;

    case 'confrereOrScholastic':
      // Search in confreres_dtl
      result = await prisma.confreres_dtl.findFirst({
        where: {
          OR: [
            { confrer_name: { equals: nameOrCode, mode: 'insensitive' } },
            { confrer_code: nameOrCode }
          ]
        }
      });

      // If not found in confreres, search in scholastics_dtl
      if (!result) {
        result = await prisma.scholastics_dtl.findFirst({
          where: {
            OR: [
              { scholastic_name: { equals: nameOrCode, mode: 'insensitive' } },
              { scholastic_code: nameOrCode }
            ]
          }
        });
      }

      if (!result) {
        throw new Error(`Confrere or Scholastic name or code ${nameOrCode} not found`);
      }

      // Return the appropriate code based on which table matched
      return result.confrer_code || result.scholastic_code;

    case 'country':
      whereCondition = {
        OR: [
          { country_name: { equals: nameOrCode, mode: 'insensitive' } },
          { alpha_3code: nameOrCode }
        ],
      };
      result = await prisma.countrymetadata.findFirst({ where: whereCondition });

      if (!result) {
        throw new Error(`Country name or code ${nameOrCode} not found`);
      }

      return result.alpha_3code;

    case 'origincountry':
      whereCondition = {
        OR: [
          { country_name: { equals: nameOrCode, mode: 'insensitive' } },
          { country_code: nameOrCode }
        ],
      };
      result = await prisma.country_mst.findFirst({ where: whereCondition });

      if (!result) {
        throw new Error(`Country name or code ${nameOrCode} not found`);
      }

      return result.country_code;

    default:
      throw new Error(`Unknown type: ${type}`);
  }
}


async function findConfrerOrScholasticCode(firstName, middleName, lastName) {
  // Try to find in confreres_dtl
  let result = await prisma.confreres_dtl.findFirst({
    where: {
      first_name: { equals: firstName, mode: 'insensitive' },
      middle_name: { equals: middleName || null, mode: 'insensitive' },
      last_name: { equals: lastName, mode: 'insensitive' }
    }
  });

  // If not found, try to find in scholastics_dtl
  if (!result) {
    result = await prisma.scholastics_dtl.findFirst({
      where: {
        first_name: { equals: firstName, mode: 'insensitive' },
        middle_name: { equals: middleName || null, mode: 'insensitive' },
        last_name: { equals: lastName, mode: 'insensitive' }
      }
    });
  }

  // Return the code if found
  return result ? (result.confrer_code || result.scholastic_code) : null;
}

export const saveObituary = async (req, res) => {
  try {
    const {
      confrer_scholastic_code,
      member_type_code,
      cause_of_death,
      disease_name,
      death_place,
      death_date,
      death_country_code,
      orgin_country_code,
      remarks
    } = req.body;

    const formattedDeathDate = new Date(death_date);

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const provinceNameFromToken = decoded.province_name;
    const createdBy = decoded.role_name || decoded.username || 'Unknown';
    if (!provinceNameFromToken) {
      return res.status(400).json({ error: "Province information is missing in token" });
    }

    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceNameFromToken },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: `Province '${provinceNameFromToken}' not found.` });
    }

    const province_code = province.province_code;

    const confrerorscholastic = await prisma.confreres_dtl.findFirst({
      where: { confrer_code: confrer_scholastic_code },
    }) || await prisma.scholastics_dtl.findFirst({
      where: { scholastic_code: confrer_scholastic_code },
    });

    if (!confrerorscholastic) {
      return res.status(404).json({ error: `Confrer or Scholastic code ${confrer_scholastic_code} not found` });
    }

    const existingObituary = await prisma.obituary_dtl.findFirst({
      where: { province_code, confrer_scholastic_code },
    });

    if (existingObituary) {
      return res.status(400).json({
        error: `An obituary record already exists for confrer_scholastic_code '${confrer_scholastic_code}' in province '${province_code}'.`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.confreres_dtl.updateMany({ where: { confrer_code: confrer_scholastic_code }, data: { is_active: false } });
      await tx.scholastics_dtl.updateMany({ where: { scholastic_code: confrer_scholastic_code }, data: { is_active: false } });
      await tx.appoint_transfer_dtl.updateMany({ where: { confrer_code: confrer_scholastic_code }, data: { is_active: false } });

      const memberType = await tx.quickcode_mst.findFirst({
        where: { quick_code_type: 'memtyp', quick_code: member_type_code },
      });

      if (!memberType) {
        throw new Error(`Member type code ${member_type_code} not found.`);
      }

      const obituary_code = await generateNextObituaryCode();

      return await tx.obituary_dtl.create({
        data: {
          obituary_code,
          province_code,
          confrer_scholastic_code,
          member_type_code,
          cause_of_death,
          disease_name,
          death_place,
          death_date: formattedDeathDate,
          death_country_code,
          orgin_country_code,
          remarks,
          language_code: 'en',
          concurrency_val: 1,
          created_by: createdBy,
          created_date: new Date(),
        },
      });
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error saving obituary:', error);
    return res.status(500).json({ error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};




export async function getObituaryData(req, res) {
  try {
    const { provinceCodes } = await resolveDataScope(req, prisma, req.query.province_code || null);
    

   // 🔴 Only fetch obituaries for the user's province
   const obituaries = await prisma.obituary_dtl.findMany({
    where: provinceScopeWhere(provinceCodes),
  });

    // Fetch all confreres details from confreres_dtl table
    const confreres = await prisma.confreres_dtl.findMany({
      select: {
        confrer_code: true,
        first_name: true,
        middle_name: true,
        last_name: true,
      },
    });

    // Fetch member type names from quickcode_mst table where quick_code_type is 'memtyp'
    const memberTypes = await prisma.quickcode_mst.findMany({
      where: { quick_code_type: 'memtyp' },
      select: {
        quick_code: true,
        quickcode_name: true,
      },
    });

    const originCountries = await prisma.country_mst.findMany({
      select: {
        country_code: true,
        country_name: true,
      },
    });

    // Fetch country names from `country_metadata` for death countries
    const deathCountries = await prisma.countrymetadata.findMany({
      select: {
        alpha_3code: true,
        country_name: true,
      },
    });
    // Fetch province names
    const provinces = await prisma.province_mst.findMany({
      select: {
        province_code: true,
        province_name: true,
      },
    });

    // Helper function to format date to 'yyyy-MM-dd'
    const formatDate = (date) => (date ? new Date(date).toISOString().split('T')[0] : null);

    // Map and merge obituary data with the required fields
    const responseResult = obituaries.map((obituary) => {
      // Find the confrere's details based on confrer_scholastic_code (deceased)
      const confrere = confreres.find((c) => c.confrer_code === obituary.confrer_scholastic_code);
      const deceasedName = confrere
        ? `${confrere.first_name} ${confrere.middle_name || ''} ${confrere.last_name}`.trim()
        : 'N/A';

      // Find the member type name based on the member_type_code
      const memberType = memberTypes.find((mt) => mt.quick_code === obituary.member_type_code);
      const memberTypeName = memberType ? memberType.quickcode_name : 'N/A';

      // Find province name based on the province_code
      const province = provinces.find((p) => p.province_code === obituary.province_code);
      const provinceName = province ? province.province_name : 'N/A';

      
    // Find country name for death_country_code from `country_metadata`
    const deathCountry = deathCountries.find((country) => country.alpha_3code === obituary.death_country_code);

    // Find country name for origin_country_code from `country_mst`
    const originCountry = originCountries.find((country) => country.country_code === obituary.orgin_country_code);

      return {
        obituary_code: obituary.obituary_code,
        province_code: obituary.province_code, // Pass province code for editing
        province_name: provinceName,  // Pass province name
        member_type_code: obituary.member_type_code, // Pass member type code
        member_type_name: memberTypeName,
        confrer_code: obituary.confrer_scholastic_code,
        deceased_name: obituary.disease_name || deceasedName || 'N/A',
        cause_of_death: obituary.cause_of_death || 'N/A',
        death_place: obituary.death_place || 'N/A',
        death_date: formatDate(obituary.death_date),
        death_country_code: obituary.death_country_code, // Pass death_country_code for editing
        death_country_name: deathCountry ? deathCountry.country_name : 'N/A', // ✅ Get from `country_metadata`
        origin_country_code: obituary.orgin_country_code, // Pass origin_country_code for editing
        origin_country_name: originCountry ? originCountry.country_name : 'N/A',
        remarks: obituary.remarks || 'N/A',
        created_by: obituary.created_by,
        created_date: formatDate(obituary.created_date),
        updated_by: obituary.updated_by,
        updated_date: formatDate(obituary.updated_date),
      };
    });

    return res.status(200).json(responseResult);
  } catch (error) {
    console.error('Error fetching obituary data:', error);
    return sendScopeError(res, error, 'An error occurred while fetching obituary data.');
  }
}


export const getObituaryByCode = async (req, res) => {
  const { obituary_code } = req.query;

  try {
    if (!obituary_code) {
      return res.status(400).json({ error: 'Obituary code is required.' });
    }

    // Fetch the obituary by `obituary_code`
    const obituary = await prisma.obituary_dtl.findFirst({
      where: { obituary_code },
    });

    if (!obituary) {
      return res.status(404).json({ error: 'Obituary not found.' });
    }

    // Return the fetched obituary
    return res.status(200).json(obituary);
  } catch (error) {
    console.error('Error fetching obituary:', error);
    return res.status(500).json({ error: 'An error occurred while fetching the obituary.' });
  } finally {
    await prisma.$disconnect();
  }
};

export const deleteObituary = async (req, res) => {
  const { obituary_code } = req.params;
  const trimmedObituaryCode = obituary_code.trim(); // Trim spaces for safety

  console.log("Received obituary_code:", trimmedObituaryCode);

  try {
    // Check authentication and extract token details
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Extract province_code from the token
    const provinceName = decoded.province_name;
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the logged-in user" });
    }

    const province_code = province.province_code;

    // Check if obituary exists for the given code and province
    const existingObituary = await prisma.obituary_dtl.findFirst({
      where: {
        obituary_code: trimmedObituaryCode,
        province_code: province_code,
      },
    });

    if (!existingObituary) {
      return res.status(404).json({
        error: `Obituary not found for code '${trimmedObituaryCode}' in province '${province_code}'.`,
      });
    }

    const { confrer_scholastic_code, member_type_code } = existingObituary;

    // Check if corresponding departure record exists
    const existingDeparture = await prisma.departures_dtl.findFirst({
      where: {
        province_code: province_code,
        confrer_scholastic_code: confrer_scholastic_code,
        member_type_code: member_type_code || null,
      },
    });

    // Transaction: Delete obituary and reactivate departure if exists
    let departureFound = false;
    await prisma.$transaction(async (tx) => {
      // Delete the obituary record
      await tx.obituary_dtl.delete({
        where: {
          obituary_code_province_code_confrer_scholastic_code: {
            obituary_code: trimmedObituaryCode,
            province_code: province_code,
            confrer_scholastic_code: confrer_scholastic_code,
          },
        },
      });

      console.log(`Deleted obituary record for confrer_scholastic_code: ${confrer_scholastic_code}`);

      if (existingDeparture) {
        await tx.departures_dtl.update({
          where: { departure_code: existingDeparture.departure_code },
          data: {
            date_of_death: null,
            place_of_death: null,
            cause_of_death: null,
            country_of_death: null,
            country_of_origin: null,
          },
        });
        console.log(`Reactivated departure record: ${existingDeparture.departure_code}`);
        departureFound = true;
      }

      // Reactivate related records
      await tx.confreres_dtl.updateMany({
        where: { confrer_code: confrer_scholastic_code },
        data: { is_active: true },
      });

      await tx.scholastics_dtl.updateMany({
        where: { scholastic_code: confrer_scholastic_code },
        data: { is_active: true },
      });

      await tx.appoint_transfer_dtl.updateMany({
        where: { confrer_code: confrer_scholastic_code },
        data: { is_active: true },
      });

      console.log(`Reactivated related records for confrer_scholastic_code: ${confrer_scholastic_code}`);
    });

    // Send response
    if (departureFound) {
      return res.status(200).json({
        message: `Obituary data deleted successfully. The corresponding departure record has been reactivated.`,
      });
    } else {
      return res.status(200).json({
        message: `Obituary data deleted successfully.`,
      });
    }
  } catch (error) {
    console.error('Error deleting obituary:', error);
    return res.status(500).json({ error: 'An error occurred while deleting the obituary.' });
  } finally {
    await prisma.$disconnect();
  }
};




export const updateObituaryByCode = async (req, res) => {
  const { obituary_code } = req.params;
  const trimmedObituaryCode = obituary_code.trim();
  try {

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

    const provinceNameFromToken = decoded.province_name;
    const UpdateBy = decoded.role_name || decoded.username || 'Unknown';
    if (!provinceNameFromToken) {
      return res.status(400).json({ error: "Province information is missing in token" });
    }

    // Step 1: Fetch the province_code using the province_name from the token
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceNameFromToken },
      select: { province_code: true },
    });

    if (!province || !province.province_code) {
      return res.status(404).json({ error: `Province '${provinceNameFromToken}' not found.` });
    }

    const province_code = province.province_code;

    if (!obituary_code) {
      return res.status(400).json({ error: 'Obituary code is required.' });
    }

    // Validate if the obituary exists

    const existingObituary = await prisma.obituary_dtl.findFirst({
      where: { obituary_code: trimmedObituaryCode, province_code },
    });

    if (!existingObituary) {
      return res.status(404).json({ error: 'Obituary not found.' });
    }

    // Extract fields to update
    const {
      province_code: bodyProvinceCode,
      confrer_scholastic_code,
      member_type_code,
      cause_of_death,
      disease_name,
      death_place,
      death_date,
      death_country_code,
      orgin_country_code,
      remarks,
    } = req.body;

    if (bodyProvinceCode && bodyProvinceCode !== province_code) {
      const province = await prisma.province_mst.findFirst({
        where: { province_code: bodyProvinceCode },
      });

      if (!province) {
        return res.status(404).json({ error: `Province code ${bodyProvinceCode} not found.` });
      }
    }

    // Step 2: Validate and fetch `confrer_scholastic_code` from `scholastics_dtl` or `confreres_dtl` table
    if (confrer_scholastic_code) {
      let confrere = await prisma.scholastics_dtl.findFirst({
        where: { scholastic_code: confrer_scholastic_code }
      });

      if (!confrere) {
        confrere = await prisma.confreres_dtl.findFirst({
          where: { confrer_code: confrer_scholastic_code }
        });
        if (!confrere) {
          return res.status(404).json({ error: `Confrere scholastic code ${confrer_scholastic_code} not found.` });
        }
      }
    }

    // if (confrer_scholastic_code) {
    //   const existingConfrere = await prisma.obituary_dtl.findFirst({
    //     where: {
    //       confrer_scholastic_code,
    //       province_code, // Ensure the confrer_scholastic_code belongs to the same province
    //     }
    //   });

    //   if (existingConfrere) {
    //     return res.status(400).json({ error: `Confrere scholastic code ${confrer_scholastic_code} already exists for province ${province_code}.` });
    //   }
    // }


    // Step 3: Validate and fetch `member_type_code` from `quickcode_mst` table with quick_code_type 'memtyp'
    if (member_type_code) {
      const memberType = await prisma.quickcode_mst.findUnique({
        where: {
          quick_code_type_quick_code: {
            quick_code_type: 'memtyp',
            quick_code: member_type_code
          }
        }
      });

      if (!memberType) {
        return res.status(404).json({ error: `Member type code ${member_type_code} not found.` });
      }
    }

    // Convert the death_date to a Date object
    const parsedDeathDate = death_date ? new Date(death_date) : null;
    if (death_date && isNaN(parsedDeathDate)) {
      return res.status(400).json({ error: 'Invalid death_date format.' });
    }

    // Prepare the data for updating
    const updateData = {
      province_code,
      confrer_scholastic_code,
      member_type_code,
      // is_existing_member_chk,
      cause_of_death,
      disease_name,
      death_place,
      death_date: parsedDeathDate,
      death_country_code,
      orgin_country_code,
      remarks,
      updated_by: UpdateBy, // Set updated_by to 'admin'
      updated_date: new Date() // Auto set current date
    };

    if (death_country_code !== undefined) {
      updateData.death_country_code = death_country_code;
    }

    // Update the record in the database
    const updatedRecord = await prisma.obituary_dtl.update({
      where: {
        obituary_code_province_code_confrer_scholastic_code: {
          obituary_code: trimmedObituaryCode,
          province_code,  // Ensure this is correct from your token or request body
          confrer_scholastic_code,  // If you have this field, use it
        },
      },
      data: updateData,
    });

    // Return the updated record
    return res.status(200).json(updatedRecord);
  } catch (error) {
    console.error('Error updating obituary:', error);
    return res.status(500).json({ error: 'An error occurred while updating the obituary.' });
  } finally {
    await prisma.$disconnect();
  }
};


// export const saveObituaryByExcel = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded.' });
//     }

//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "Access token is missing or invalid" });
//     }

//     const token = authHeader.split(" ")[1];
//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (error) {
//       if (error.name === "TokenExpiredError") {
//         return res.status(401).json({ error: "Token has expired" });
//       }
//       if (error.name === "JsonWebTokenError") {
//         return res.status(401).json({ error: "Invalid token" });
//       }
//       return res.status(500).json({ error: "Failed to verify token" });
//     }

//     const provinceNameFromToken = decoded.province_name;
//     const createdBy = decoded.role_name || decoded.username || 'Unknown';
//     if (!provinceNameFromToken) {
//       return res.status(400).json({ error: "Province information is missing in token" });
//     }

//     // Fetch province code from the database using the province name in the token
//     const { province_code } = await fetchCodeByNameOrCode(provinceNameFromToken, 'province');
//     console.log (province_code)

//     // Read the Excel file
//     let workbook;
//     try {
//       const filePath = req.file.path;
//       const fileBuffer = fs.readFileSync(filePath);
//       workbook = xlsx.read(fileBuffer, { type: 'buffer' });
//     } catch (parseError) {
//       console.error('Error parsing Excel file:', parseError);
//       return res.status(400).json({ error: 'Failed to parse Excel file. Please check the file format.' });
//     }

//     if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
//       return res.status(400).json({ error: 'The uploaded Excel file does not contain any sheets.' });
//     }

//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];

//     if (!sheet) {
//       return res.status(400).json({ error: 'The sheet in the Excel file is empty or corrupted.' });
//     }

//     let rows;
//     try {
//       rows = xlsx.utils.sheet_to_json(sheet);
//     } catch (jsonError) {
//       console.error('Error converting sheet to JSON:', jsonError);
//       return res.status(400).json({ error: 'Failed to convert Excel sheet to JSON format.' });
//     }

//     if (!rows || rows.length === 0) {
//       return res.status(400).json({ error: 'No data found in the Excel file.' });
//     }

//     const successRecords = [];
//     const failedRecords = [];

//     const parseDate = (dateStr) => {
//       if (!dateStr) return null;
//       if (typeof dateStr === 'number') {
//         return new Date((dateStr - 25569) * 86400 * 1000); // Convert serial date to JS date
//       }
//       const datePattern = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;
//       const match = dateStr.match(datePattern);
//       if (match) {
//         const [, day, month, year] = match;
//         return new Date(`${year}-${month}-${day}`); // Convert to YYYY-MM-DD for JS Date
//       }
//       const parsedDate = new Date(dateStr);
//       if (isNaN(parsedDate.getTime())) {
//         throw new Error(`Invalid date format: ${dateStr}`);
//       }
//       return parsedDate;
//     };

    

//     // Process each row in the Excel sheet
//     for (const row of rows) {
//       try {
//         // Fetch and convert values based on name-to-code mapping
//         const { province_code } = row['Province']
//         ? await fetchCodeByNameOrCode(row['Province'], 'province')
//         : await fetchCodeByNameOrCode(provinceNameFromToken, 'province');
//         const member_type_code = row['Member Type'] ? await fetchCodeByNameOrCode(row['Member Type'], 'memberType') : null;
//         const cause_of_death = row['Cause of Death'] ? String(row['Cause of Death']).trim() : null;
//         const death_place = row['Death Place'] ? String(row['Death Place']).trim() : null;
//         const death_date = row['Date of Death'] ? parseDate(row['Date of Death']) : null;
//         const death_country_code = row['Country of Death'] ? (await fetchCodeByNameOrCode(row['Country of Death'], 'country')) : null;
//         const orgin_country_code = row['Country of Origin'] ? (await fetchCodeByNameOrCode(row['Country of Origin'], 'origincountry')) : null;
//         const remarks = row['Remarks'] ? String(row['Remarks']).trim() : null;

//         // Validate required fields
//         if (!province_code || !row['Name of the Diseased'] || !member_type_code) {
//           throw new Error('Missing required fields or failed to convert names to codes.');
//         }

//         // Extract the name components of the diseased
//         const nameParts = row['Name of the Diseased'].trim().split(' ');
//         const firstName = nameParts[0];
//         const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
//         const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

//         // Find confrer_scholastic_code by matching the name in either confreres_dtl or scholastics_dtl
//         let confrer_scholastic_code = await findConfrerOrScholasticCode(firstName, middleName, lastName);

//         if (!confrer_scholastic_code) {
//           throw new Error(`Confrere or Scholastic name "${row['Name of the Diseased']}" not found.`);
//         }

//        const existingRecord = await prisma.obituary_dtl.findFirst({
//           where: { confrer_scholastic_code: confrer_scholastic_code },
//         });

//         if (existingRecord) {
//           // If the record exists, add it to the failed records with a message
//           failedRecords.push({
//             row,
//             error: `Obituary with confrer_scholastic_code "${confrer_scholastic_code}" already exists.`,
//           });
//           continue; // Skip saving this record
//         }
        

//         // Set disease_name as the original name from the Excel
//         const disease_name = row['Name of the Diseased'];

//         // Generate `obituary_code`
//         const obituary_code = await generateNextObituaryCode();

//         // Prepare data for saving
//         const saveData = {
//           obituary_code,
//           province_code: province_code,
//           confrer_scholastic_code,
//           member_type_code,
//           cause_of_death,
//           disease_name,
//           death_place,
//           death_date: death_date,
//           death_country_code,
//           orgin_country_code,
//           remarks,
//           language_code: 'en', // Default value
//           concurrency_val: 1, // Default value
//           created_by: createdBy, // Default value
//           created_date: new Date(), // Auto set current date
//           updated_by: null, // Default value
//           updated_date: null // Default value
//         };

//         // Save the record in the database
//         await prisma.obituary_dtl.create({ data: saveData });
//         successRecords.push(row);
//       } catch (err) {
//         console.error(`Error processing row: ${err.message}`, row);
//         failedRecords.push({ row, error: err.message });
//       }
//     }

//     // Response handling based on success/failure records
//     if (successRecords.length > 0 && failedRecords.length === 0) {
//       return res.status(200).json({
//         message: 'All obituaries uploaded successfully.',
//         savedRecords: successRecords,
//       });
//     } else if (successRecords.length > 0 && failedRecords.length > 0) {
//       return res.status(207).json({
//         message: 'Some obituaries uploaded successfully. Some failed.',
//         savedRecords: successRecords,
//         failedRecords,
//       });
//     } else {
//       return res.status(400).json({
//         message: 'All obituaries failed to upload.',
//         failedRecords,
//       });
//     }
//   } catch (error) {
//     console.error('Error uploading obituaries:', error.message);
//     res.status(500).json({ error: 'An error occurred while processing the file.' });
//   }
// };


// export const saveObituaryByExcel = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded.' });
//     }

//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "Access token is missing or invalid" });
//     }

//     const token = authHeader.split(" ")[1];
//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (error) {
//       console.error('JWT verification error:', error);  // Log error for token issues
//       if (error.name === "TokenExpiredError") {
//         return res.status(401).json({ error: "Token has expired" });
//       }
//       if (error.name === "JsonWebTokenError") {
//         return res.status(401).json({ error: "Invalid token" });
//       }
//       return res.status(500).json({ error: "Failed to verify token" });
//     }

//     const provinceNameFromToken = decoded.province_name;
//     const createdBy = decoded.role_name || decoded.username || 'Unknown';
//     if (!provinceNameFromToken) {
//       return res.status(400).json({ error: "Province information is missing in token" });
//     }

//     // Fetch province code from the database using the province name in the token
//     const { province_code } = await fetchCodeByNameOrCode(provinceNameFromToken, 'province');
//     console.log("Province code from token:", province_code); // Debugging log

//     // Read the Excel file
//     let workbook;
//     try {
//       const filePath = req.file.path;
//       const fileBuffer = fs.readFileSync(filePath);
//       workbook = xlsx.read(fileBuffer, { type: 'buffer' });
//     } catch (parseError) {
//       console.error('Error parsing Excel file:', parseError);
//       return res.status(400).json({ error: 'Failed to parse Excel file. Please check the file format.' });
//     }

//     if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
//       return res.status(400).json({ error: 'The uploaded Excel file does not contain any sheets.' });
//     }

//     const sheetName = workbook.SheetNames[0];
//     const sheet = workbook.Sheets[sheetName];

//     if (!sheet) {
//       return res.status(400).json({ error: 'The sheet in the Excel file is empty or corrupted.' });
//     }

//     let rows;
//     try {
//       rows = xlsx.utils.sheet_to_json(sheet);
//     } catch (jsonError) {
//       console.error('Error converting sheet to JSON:', jsonError);
//       return res.status(400).json({ error: 'Failed to convert Excel sheet to JSON format.' });
//     }

//     if (!rows || rows.length === 0) {
//       return res.status(400).json({ error: 'No data found in the Excel file.' });
//     }

//     const successRecords = [];

//     // Helper function to parse dates
//     const parseDate = (dateStr) => {
//       if (!dateStr) return null;
//       if (typeof dateStr === 'number') {
//         return new Date((dateStr - 25569) * 86400 * 1000); // Convert serial date to JS date
//       }
//       const datePattern = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;
//       const match = dateStr.match(datePattern);
//       if (match) {
//         const [, day, month, year] = match;
//         return new Date(`${year}-${month}-${day}`); // Convert to YYYY-MM-DD for JS Date
//       }
//       const parsedDate = new Date(dateStr);
//       if (isNaN(parsedDate.getTime())) {
//         throw new Error(`Invalid date format: ${dateStr}`);
//       }
//       return parsedDate;
//     };

//     // Process each row in the Excel sheet
//     for (const row of rows) {
//       try {
//         // Fetch and convert values based on name-to-code mapping
//         const { province_code } = row['Province']
//           ? await fetchCodeByNameOrCode(row['Province'], 'province')
//           : await fetchCodeByNameOrCode(provinceNameFromToken, 'province');
//         const member_type_code = row['Member Type'] ? await fetchCodeByNameOrCode(row['Member Type'], 'memberType') : null;
//         const cause_of_death = row['Cause of Death'] ? String(row['Cause of Death']).trim() : null;
//         const death_place = row['Death Place'] ? String(row['Death Place']).trim() : null;
//         const death_date = row['Date of Death'] ? parseDate(row['Date of Death']) : null;
//         const death_country_code = row['Country of Death'] ? (await fetchCodeByNameOrCode(row['Country of Death'], 'country')) : null;
//         const orgin_country_code = row['Country of Origin'] ? (await fetchCodeByNameOrCode(row['Country of Origin'], 'origincountry')) : null;
//         const remarks = row['Remarks'] ? String(row['Remarks']).trim() : null;

//         // Validate required fields
//         if (!province_code || !row['Name of the Diseased'] || !member_type_code) {
//           throw new Error('Missing required fields or failed to convert names to codes.');
//         }

//         // Extract the name components of the diseased
//         const nameParts = row['Name of the Diseased'].trim().split(' ');
//         const firstName = nameParts[0];
//         const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
//         const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

//         // Find confrer_scholastic_code by matching the name in either confreres_dtl or scholastics_dtl
//         let confrer_scholastic_code = await findConfrerOrScholasticCode(firstName, middleName, lastName);

//         if (!confrer_scholastic_code) {
//           throw new Error(`Confrere or Scholastic name "${row['Name of the Diseased']}" not found.`);
//         }

//         const existingRecord = await prisma.obituary_dtl.findFirst({
//           where: { confrer_scholastic_code: confrer_scholastic_code },
//         });

//         if (existingRecord) {
//           // If the record exists, skip this record and return an error for this specific row
//           return res.status(400).json({
//             error: `Obituary with confrer or scholastic already exists.`
//           });
//         }

//         // Save data preparation
//         const disease_name = row['Name of the Diseased'];
//         const obituary_code = await generateNextObituaryCode();

//         const saveData = {
//           obituary_code,
//           province_code,
//           confrer_scholastic_code,
//           member_type_code,
//           cause_of_death,
//           disease_name,
//           death_place,
//           death_date,
//           death_country_code,
//           orgin_country_code,
//           remarks,
//           language_code: 'en', // Default value
//           concurrency_val: 1, // Default value
//           created_by: createdBy, // Default value
//           created_date: new Date(), // Auto set current date
//           updated_by: null, // Default value
//           updated_date: null // Default value
//         };

//         // Save the record in the database
//         await prisma.obituary_dtl.create({ data: saveData });
//         successRecords.push(row);
//       } catch (err) {
//         console.error(`Error processing row: ${err.message}`, row);
//         return res.status(400).json({ error: `Error processing record: ${err.message}` });
//       }
//     }

//     // Response handling based on success records
//     if (successRecords.length > 0) {
//       return res.status(200).json({
//         message: 'Obituaries uploaded successfully.',
//         savedRecords: successRecords,
//       });
//     } else {
//       return res.status(400).json({
//         message: 'No records were uploaded. Please check the data and try again.',
//       });
//     }
//   } catch (error) {
//     console.error('Unexpected error during upload:', error);
//     return res.status(500).json({ error: 'An unexpected error occurred during the upload.' });
//   }
// };



export const saveObituaryByExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.error('JWT verification error:', error);
      return res.status(401).json({ error: error.message });
    }

    const provinceNameFromToken = decoded.province_name;
    const createdBy = decoded.role_name || decoded.username || 'Unknown';
    if (!provinceNameFromToken) {
      return res.status(400).json({ error: "Province information is missing in token" });
    }

    const { province_code } = await fetchCodeByNameOrCode(provinceNameFromToken, 'province');

    let workbook;
    try {
      const fileBuffer =  req.file.buffer;
      workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    } catch (parseError) {
      console.error('Error parsing Excel file:', parseError);
      return res.status(400).json({ error: 'Failed to parse Excel file. Please check the file format.' });
    }

    if (!workbook.SheetNames.length) {
      return res.status(400).json({ error: 'The uploaded Excel file does not contain any sheets.' });
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) {
      return res.status(400).json({ error: 'The sheet in the Excel file is empty or corrupted.' });
    }

    let rows;
    try {
      rows = xlsx.utils.sheet_to_json(sheet);
    } catch (jsonError) {
      console.error('Error converting sheet to JSON:', jsonError);
      return res.status(400).json({ error: 'Failed to convert Excel sheet to JSON format.' });
    }

    if (!rows.length) {
      return res.status(400).json({ error: 'No data found in the Excel file.' });
    }

    const successRecords = [];
    const failedRecords = [];

    // Helper function to parse dates
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      if (typeof dateStr === 'number') {
        return new Date((dateStr - 25569) * 86400 * 1000);
      }
      const datePattern = /^(\d{2})[-/](\d{2})[-/](\d{4})$/;
      const match = dateStr.match(datePattern);
      if (match) {
        return new Date(`${match[3]}-${match[2]}-${match[1]}`);
      }
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date format: ${dateStr}`);
      }
      return parsedDate;
    };

    for (const row of rows) {
      try {
        const { province_code } = row['Province']
          ? await fetchCodeByNameOrCode(row['Province'], 'province')
          : await fetchCodeByNameOrCode(provinceNameFromToken, 'province');
        const member_type_code = row['Member Type'] ? await fetchCodeByNameOrCode(row['Member Type'], 'memberType') : null;
        const cause_of_death = row['Cause of Death'] ? String(row['Cause of Death']).trim() : null;
        const death_place = row['Death Place'] ? String(row['Death Place']).trim() : null;
        const death_date = row['Date of Death'] ? parseDate(row['Date of Death']) : null;
        const death_country_code = row['Country of Death'] ? (await fetchCodeByNameOrCode(row['Country of Death'], 'country')) : null;
        const orgin_country_code = row['Country of Origin'] ? (await fetchCodeByNameOrCode(row['Country of Origin'], 'origincountry')) : null;
        const remarks = row['Remarks'] ? String(row['Remarks']).trim() : null;

        if (!province_code || !row['Name of the Diseased'] || !member_type_code) {
          throw new Error('Missing required fields.');
        }

        const nameParts = row['Name of the Diseased'].trim().split(' ');
        const firstName = nameParts[0];
        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

        // Find confrer_scholastic_code, allow null if not found
        let confrer_scholastic_code = await findConfrerOrScholasticCode(firstName, middleName, lastName);
        if (!confrer_scholastic_code) {
          console.warn(`Confrere or Scholastic not found for name: ${row['Name of the Diseased']}`);
          confrer_scholastic_code = "UNKNOWN"; // Use a placeholder instead of null
        }
        

        // const existingRecord = await prisma.obituary_dtl.findFirst({
        //   where: { confrer_scholastic_code },
        // });

        // if (existingRecord) {
        //   console.warn(`Obituary already exists for confrer_scholastic_code: ${confrer_scholastic_code}`);
        //   failedRecords.push({ row, error: 'Obituary already exists' });
        //   continue;
        // }

        const obituary_code = await generateNextObituaryCode();
        const saveData = {
          obituary_code,
          province_code,
          confrer_scholastic_code, // This can now be null
          member_type_code,
          cause_of_death,
          disease_name: row['Name of the Diseased'],
          death_place,
          death_date,
          death_country_code,
          orgin_country_code,
          remarks,
          language_code: 'en',
          concurrency_val: 1,
          created_by: createdBy,
          created_date: new Date(),
          updated_by: null,
          updated_date: null
        };

        if (confrer_scholastic_code) {
          saveData.confrer_scholastic_code = confrer_scholastic_code;
        }

        await prisma.obituary_dtl.create({ data: saveData });
        successRecords.push(row);
      } catch (err) {
        console.error(`Error processing row: ${err.message}`, row);
        failedRecords.push({ row, error: err.message });
      }
    }

    return res.status(200).json({
      message: 'Processing completed',
      savedRecords: successRecords,
      failedRecords: failedRecords.length > 0 ? failedRecords : null
    });

  } catch (error) {
    console.error('Unexpected error during upload:', error);
    return res.status(500).json({ error: 'An unexpected error occurred during the upload.' });
  }
};

export const getObituary = async (req, res) => {
  const { obituary_code } = req.params;

  try {
    if (!obituary_code) {
      return res.status(400).json({ error: 'Obituary code is required.' });
    }

    const globalIdentity = estatusRecordWhere(req);
    const { provinceCodes } = globalIdentity ? { provinceCodes: null } : await resolveDataScope(req, prisma, req.query.province_code || null);
    // Global read access is established only by the dedicated eStatus GET route.
    const obituary = await prisma.obituary_dtl.findFirst({
      where: globalIdentity || { obituary_code, ...provinceScopeWhere(provinceCodes) },
    });

    if (!obituary) {
      return res.status(404).json({ error: 'Obituary not found.' });
    }

    // Fetch province name
    const province = await prisma.province_mst.findFirst({
      where: { province_code: obituary.province_code },
      select: { province_name: true },
    });

    // Fetch member type name
    const memberType = globalIdentity && !obituary.member_type_code ? null : await prisma.quickcode_mst.findFirst({
      where: { quick_code_type: 'memtyp', quick_code: obituary.member_type_code },
      select: { quickcode_name: true },
    });

    // Fetch country details
    const deathCountry = globalIdentity && !obituary.death_country_code ? null : await prisma.countrymetadata.findFirst({
      where: { alpha_3code: obituary.death_country_code },
      select: { country_name: true },
    });

    const originCountry = globalIdentity && !obituary.orgin_country_code ? null : await prisma.country_mst.findFirst({
      where: { country_code: obituary.orgin_country_code },
      select: { country_name: true },
    });

    let personDetails = null;
    let currentDesignationDetails = null;
    let previousDesignationDetails = null;
    let academicDetails = null;

    // ✅ Check if confrere_scholastic_code belongs to a confrere
    let confrere = await prisma.confreres_dtl.findFirst({
      where: { confrer_code: obituary.confrer_scholastic_code },
    });

    if (confrere) {
      // ✅ Fetch Designations (appointment transfer data)
      const [currentDesignation, previousDesignations] = await Promise.all([
        prisma.appoint_transfer_dtl.findMany({
          where: { confrer_code: obituary.confrer_scholastic_code, designation_end_date: null },
          select: { designation_code: true, designation_appn_date: true, centre_code: true },
        }),
        prisma.appoint_transfer_dtl.findMany({
          where: { confrer_code: obituary.confrer_scholastic_code, designation_end_date: { not: null } },
          select: { designation_code: true, designation_appn_date: true, designation_end_date: true, centre_code: true },
          orderBy: { designation_end_date: 'desc' },
        }),
      ]);

      // Process Designations
      const processDesignationDetails = async (designations) => {
        return Promise.all(designations.map(async (designation) => {
          const [designationName, centreDetails] = await Promise.all([
            prisma.quickcode_mst.findFirst({
              where: { quick_code: designation.designation_code, quick_code_type: 'destyp' },
              select: { quickcode_name: true },
            }),
            prisma.centre_dtl.findFirst({
              where: { centre_code: designation.centre_code },
              select: { centre_name: true, centre_place: true, address1: true, address2: true, address3: true },
            }),
          ]);

          const fullAddress = [centreDetails?.address1, centreDetails?.address2, centreDetails?.address3]
            .filter(Boolean)
            .join(', ') || 'N/A';

          return {
            designation_name: designationName?.quickcode_name || 'N/A',
            start_date: designation.designation_appn_date?.toISOString().split('T')[0] || null,
            end_date: designation.designation_end_date?.toISOString().split('T')[0] || null,
            centre_name: centreDetails?.centre_name || 'N/A',
            centre_place: centreDetails?.centre_place || 'N/A',
            centre_address: fullAddress,
          };
        }));
      };

      currentDesignationDetails = await processDesignationDetails(currentDesignation);
      previousDesignationDetails = await processDesignationDetails(previousDesignations);

      // ✅ Prepare Confrere Details
      personDetails = {
        name: [confrere.first_name, confrere.middle_name, confrere.last_name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
        birth_date: confrere.birth_date?.toISOString().split("T")[0] || null,
        nationality: confrere.nationality_code,
        blood_group: confrere.blood_group_code || "N/A",
        baptism_date: confrere.baptism_date?.toISOString().split("T")[0] || null,
        confirmation_date: confrere.confirmation_date?.toISOString().split("T")[0] || null,
        first_profession_date: confrere.first_profession_date?.toISOString().split("T")[0] || null,
        final_profession_date: confrere.final_profession_date?.toISOString().split("T")[0] || null,
        ordination_date: confrere.ordination_date?.toISOString().split("T")[0] || null,
        contact_no: confrere.personal1_contact_no || "N/A",
        whatsapp_no: confrere.watsup1_no || "N/A",
        emergency_contact_no: confrere.emergency_contact_no || "N/A",
        email: confrere.personal_mailid1 || "N/A",
      };
    } else {
      // ✅ If not a confrere, check if it's a Scholastic
      let scholastic = await prisma.scholastics_dtl.findFirst({
        where: { scholastic_code: obituary.confrer_scholastic_code, ...(globalIdentity ? { province_code: obituary.province_code } : {}) },
      });

      if (scholastic) {
        // ✅ Fetch Academic Details (Admission Promotion Data)
        const academicPromotions = await prisma.scholastics_admisn_promon_dtl.findMany({
          where: { scholastic_code: obituary.confrer_scholastic_code, ...(globalIdentity ? { province_code: obituary.province_code } : {}) },
          orderBy: { start_date: 'desc' },
        });

        // Extract Current Academic Stage
        let currentAcademicStage = academicPromotions.find((promo) => promo.end_date === null);

        // Fetch Academic Stage Names
        const academicStageNames = async (promotion) => {
          if (!promotion) return null;
          const [formationType, scholasticType, promotionTo] = await Promise.all([
            prisma.quickcode_mst.findFirst({ where: { quick_code: promotion.formation_type_code, quick_code_type: 'fortyp' }, select: { quickcode_name: true } }),
            prisma.quickcode_mst.findFirst({ where: { quick_code: promotion.scholastic_type_code, quick_code_type: 'schtyp' }, select: { quickcode_name: true } }),
            prisma.quickcode_mst.findFirst({ where: { quick_code: promotion.promotion_to_code, quick_code_type: 'promto' }, select: { quickcode_name: true } }),
          ]);

          return {
            formation_type_name: formationType ? formationType.quickcode_name : 'Unknown',
            scholastic_type_name: scholasticType ? scholasticType.quickcode_name : 'Unknown',
            promotion_to_name: promotionTo ? promotionTo.quickcode_name : 'Unknown',
          };
        };

        academicDetails = {
          current_stage: currentAcademicStage ? await academicStageNames(currentAcademicStage) : null,
          previous_stages: await Promise.all(
            academicPromotions.filter((promo) => promo.end_date !== null).map(async (promo) => ({
              ...promo,
              ...(await academicStageNames(promo)),
            }))
          ),
        };

        // ✅ Prepare Scholastic Details
        personDetails = {
          name: [scholastic.first_name, scholastic.middle_name, scholastic.last_name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
          birth_date: scholastic.birth_date?.toISOString().split("T")[0] || null,
          nationality: scholastic.nationality_code,
          blood_group: scholastic.blood_group_code || "N/A",
          baptism_date: scholastic.baptism_date?.toISOString().split("T")[0] || null,
          confirmation_date: scholastic.confirmation_date?.toISOString().split("T")[0] || null,
          first_profession_date: scholastic.first_profession_date?.toISOString().split("T")[0] || null,
          final_profession_date: scholastic.final_profession_date?.toISOString().split("T")[0] || null,
          diaconate_ordination_date: scholastic.diaconate_ordination_date?.toISOString().split("T")[0] || null,
          ordination_date: scholastic.ordination_date?.toISOString().split("T")[0] || null,
          contact_no: scholastic.personal1_contact_no || "N/A",
          whatsapp_no: scholastic.watsup1_no || "N/A",
          emergency_contact_no: scholastic.emergency_contact_no || "N/A",
          email: scholastic.personal_mailid1 || "N/A",
        };
      }
    }

   const convertBigIntToString = (obj) => {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
};

// ✅ Prepare Response Data
const result = {
  ...obituary,
  province_name: province?.province_name || null,
  member_type_name: memberType?.quickcode_name || null,
  death_country_name: deathCountry?.country_name || null,
  origin_country_name: originCountry?.country_name || null,
  person_details: personDetails,
  deceased_name: (personDetails?.name || obituary.disease_name || 'Name unavailable').replace(/\s+/g, ' ').trim(),
  current_designation: currentDesignationDetails,
  previous_designations: previousDesignationDetails,
  academic_details: academicDetails,
};

// ✅ Convert BigInt values before returning
return res.status(200).json(convertBigIntToString(result));

  } catch (error) {
    console.error('Error fetching obituary:', error);
    return sendScopeError(res, error, 'An error occurred while fetching the obituary.');
  } finally {
    await prisma.$disconnect();
  }
};



