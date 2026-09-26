import { sharedQuickCodes } from '../../utils/sharedQuickCodes.js';
import { PrismaClient } from '@prisma/client';
import { JWT_SECRET } from "../../config/index.js";
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";

export const saveApostolate = async (req, res) => {
  const {
    apostolate_code,
    centre_type_code,
    language_code,
    concurrency_val,
    created_by,
    created_date,
  } = req.body;

  try {
    console.log('Received data:', req.body);
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

    // Extract `province_name` and `created_by` from the token
    const provinceName = decoded.province_name;
    const createdBy = decoded.role_name || decoded.username || 'Unknown';

    // Fetch province_code based on province_name
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the given name" });
    }

    const provinceCode = province.province_code;


    // Fetch apostolate_name from quickcode_mst where quick_code_type is 'apostl' and quick_code matches apostolate_code
    const apostolate = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'apostl',
          quick_code: apostolate_code
        }
      }
    });

    console.log('Apostolate lookup result:', apostolate);

    if (!apostolate) {
      console.error(`Apostolate code ${apostolate_code} not found`);
      return res.status(404).json({ error: `Apostolate code ${apostolate_code} not found` });
    }

    // Fetch centre_type_name from quickcode_mst where quick_code_type is 'ctrtyp' and quick_code matches centre_type_code
    const centreType = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'ctrtyp',
          quick_code: centre_type_code
        }
      }
    });

    console.log('Centre type lookup result:', centreType);

    if (!centreType) {
      console.error(`Centre type code ${centre_type_code} not found`);
      return res.status(404).json({ error: `Centre type code ${centre_type_code} not found` });
    }

    const existingRecord = await prisma.apostolates_mst.findFirst({
      where: {
        apostolate_code,
        centre_type_code,

      }
    });

    if (existingRecord) {
      console.error('Duplicate entry: Apostolate with same centre type  already exists');
      return res.status(400).json({ error: 'Apostolate with the same centre type  already exists' });
    }

    // Save to apostolates_mst
    const result = await prisma.apostolates_mst.create({
      data: {
        apostolate_code,
        centre_type_code,
        province_code: provinceCode,
        apostolate_name: apostolate.quickcode_name,
        centre_type_name: centreType.quickcode_name,
        language_code,
        concurrency_val,
        created_by: createdBy,
        created_date: new Date(created_date),
      }
    });

    console.log('Data saved successfully:', result);
    return res.status(201).json({ message: 'Data saved successfully', data: result });
  } catch (error) {
    console.error('Error saving data:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
export const updateCentreTypeForApostolate = async (req, res) => {
  const { apostolate_code, new_centre_type_code, updated_center_type } = req.body;

  try {
    // Validate the token and extract province_name
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token is missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const provinceName = decoded.province_name;
    const updatedBy = decoded.role_name || decoded.username || 'Unknown';

    // Fetch the province_code from the province_name
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: 'Province not found for the given name' });
    }

    const provinceCode = province.province_code;


    // Fetch the new centre type name
    const centreType = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'ctrtyp',
          quick_code: new_centre_type_code,
        },
      },
    });

    if (!centreType) {
      console.error(`Centre type code ${new_centre_type_code} not found`);
      return res.status(404).json({ error: `Centre type code ${new_centre_type_code} not found` });
    }

    // Define the maximum length for the centre_type_name column
    const maxLength = 100; // Adjust this value to match your schema
    const truncatedCentreTypeName = centreType.quickcode_name.substring(0, maxLength); // Truncate to fit the column length

    console.log('Updating apostolate_code:', apostolate_code);
    console.log('New centre_type_code:', new_centre_type_code);
    console.log('Updated center type:', updated_center_type);
    console.log('Truncated centre_type_name:', truncatedCentreTypeName);

    // Check if the new combination of apostolate_code and centre_type_code already exists
    const existingRecordWithNewType = await prisma.apostolates_mst.findFirst({
      where: {
        apostolate_code: apostolate_code,
        centre_type_code: new_centre_type_code,
      },
    });

    if (existingRecordWithNewType) {
      console.error(`A record with apostolate_code ${apostolate_code} and new_centre_type_code ${new_centre_type_code} already exists`);
      return res.status(409).json({ error: `A record with apostolate_code ${apostolate_code} and new_centre_type_code ${new_centre_type_code} already exists` });
    }

    // Update all records with the given apostolate_code
    const result = await prisma.apostolates_mst.updateMany({
      where: {
        apostolate_code: apostolate_code,
        centre_type_code: updated_center_type, // Find records with the old centre_type_code
        province_code: provinceCode,
      },
      data: {
        centre_type_code: new_centre_type_code, // Update to the new centre_type_code
        centre_type_name: truncatedCentreTypeName,
        updated_by: updatedBy,
        updated_date: new Date(),
      },
    });

    if (result.count === 0) {
      console.error(`No records updated for apostolate_code ${apostolate_code} with updated_center_type ${updated_center_type}`);
      return res.status(404).json({ error: `No records updated for apostolate_code ${apostolate_code} with updated_center_type ${updated_center_type}` });
    }

    console.log('Centre type updated successfully:', result);
    return res.status(200).json({ message: 'Centre type updated successfully', data: result });
  } catch (error) {
    console.error('Error updating centre type:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};







export const getApostolates = async (req, res) => {
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

    // Step 1: Fetch Data from `apostolates_mst`
    const apostolates = await prisma.apostolates_mst.findMany({
      where: { province_code: provinceCode },
    });;

    // Step 2: Fetch Data from `quickcode_mst` for Apostolates
    const apostolateCodes = apostolates.map(a => a.apostolate_code);
    const apostolateNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'apostl',
        quick_code: { in: apostolateCodes }
      },
      select: {
        quick_code: true,
        quickcode_name: true
      }
    });

    // Step 3: Fetch Data from `quickcode_mst` for Centre Types
    const centreTypeCodes = apostolates.map(a => a.centre_type_code);
    const centreTypeNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'ctrtyp',
        quick_code: { in: centreTypeCodes }
      },
      select: {
        quick_code: true,
        quickcode_name: true
      }
    });

    const centres = await prisma.centre_dtl.findMany({
      where: { apostolate_code: { in: apostolateCodes } },
      select: {
        apostolate_code: true,
        centre_name: true,
        centre_place: true,
      },
    });



    // Step 4: Combine the Results
    const formattedApostolates = apostolates.map(apostolate => {
      const apostolateName = apostolateNames.find(a => a.quick_code === apostolate.apostolate_code);
      const centreTypeName = centreTypeNames.find(c => c.quick_code === apostolate.centre_type_code);

      const associatedCentres = centres
        .filter((centre) => centre.apostolate_code === apostolate.apostolate_code)
        .map((centre) => ({
          centre_name: centre.centre_name,
          centre_place: centre.centre_place,
        }));


      return {
        apostolate_code: apostolate.apostolate_code,
        apostolate_name: apostolateName ? apostolateName.quickcode_name : null,
        centre_type_code: apostolate.centre_type_code,
        centre_type_name: centreTypeName ? centreTypeName.quickcode_name : null,
        centres: associatedCentres,
        date_format: apostolate.date_format,
        academic_year: apostolate.academic_year,
        language_code: apostolate.language_code,
        concurrency_val: apostolate.concurrency_val,
        created_by: apostolate.created_by,
        created_date: apostolate.created_date,
        updated_by: apostolate.updated_by,
        updated_date: apostolate.updated_date
      };
    });

    res.status(200).json({ data: formattedApostolates });
  } catch (error) {
    console.error('Error fetching apostolates:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getApostolate = async (req, res) => {
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

    // Step 1: Fetch Data from `apostolates_mst`
    const apostolates = await prisma.apostolates_mst.findMany({
      where: { province_code: provinceCode },
    });

    // Step 2: Fetch Data from `quickcode_mst` for Apostolates
    const apostolateCodes = apostolates.map((a) => a.apostolate_code);
    const apostolateNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: "apostl",
        quick_code: { in: apostolateCodes },
      },
      select: {
        quick_code: true,
        quickcode_name: true,
      },
      orderBy: {
        quickcode_name: "asc", // Sort Apostolate Names
      },
    });

    // Step 3: Fetch Data from `quickcode_mst` for Centre Types
    const centreTypeCodes = apostolates.map((a) => a.centre_type_code);
    const centreTypeNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: "ctrtyp",
        quick_code: { in: centreTypeCodes },
      },
      select: {
        quick_code: true,
        quickcode_name: true,
      },
      orderBy: {
        quickcode_name: "asc", // Sort Apostolate Names
      },
    });

    const centres = await prisma.centre_dtl.findMany({
      where: { apostolate_code: { in: apostolateCodes } },
      select: {
        apostolate_code: true,
        centre_name: true,
        centre_place: true,
      },
    });

    // Step 4: Group by apostolate and combine results
    const groupedApostolates = apostolates.reduce((acc, apostolate) => {
      const apostolateName = apostolateNames.find(
        (a) => a.quick_code === apostolate.apostolate_code
      );
      const centreTypeName = centreTypeNames.find(
        (c) => c.quick_code === apostolate.centre_type_code
      );

      if (!acc[apostolate.apostolate_code]) {
        acc[apostolate.apostolate_code] = {
          apostolate_code: apostolate.apostolate_code,
          apostolate_name: apostolateName ? apostolateName.quickcode_name : null,
          centre_types: [],
          date_format: apostolate.date_format,
          academic_year: apostolate.academic_year,
          language_code: apostolate.language_code,
          concurrency_val: apostolate.concurrency_val,
          created_by: apostolate.created_by,
          created_date: apostolate.created_date,
          updated_by: apostolate.updated_by,
          updated_date: apostolate.updated_date,
        };
      }

      acc[apostolate.apostolate_code].centre_types.push({
        centre_type_code: apostolate.centre_type_code,
        centre_type_name: centreTypeName ? centreTypeName.quickcode_name : null,
        centres: centres
          .filter((centre) => centre.apostolate_code === apostolate.apostolate_code)
          .map((centre) => ({
            centre_name: centre.centre_name,
            centre_place: centre.centre_place,
          })),
      });

      return acc;
    }, {});

       // Convert grouped object to array and sort apostolates alphabetically
       const formattedApostolates = Object.values(groupedApostolates).sort((a, b) =>
        a.apostolate_name.localeCompare(b.apostolate_name)
      );
  
      // Sort centre types inside each apostolate
      formattedApostolates.forEach((apostolate) => {
        apostolate.centre_types.sort((a, b) =>
          a.centre_type_name.localeCompare(b.centre_type_name)
        );
      });

    res.status(200).json({ data: formattedApostolates });
  } catch (error) {
    console.error("Error fetching apostolates:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteApostolate = async (req, res) => {
  const { apostolate_code, centre_type_code } = req.body;

  try {

    const authHeader = req.headers.authorization;
    console.log(authHeader)
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


    // Find the corresponding province_code based on province_name
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the given name" });
    }
    const provinceCode = province.province_code;



    if (apostolate_code && centre_type_code) {
      // Delete only if both codes match
      const relatedCentreRecords = await prisma.centre_dtl.findMany({
        where: {
          apostolate_code,
          centre_type_code,
          province_code: provinceCode,
        },
      });

      // If there are related records in centre_dtl, warn the user
      if (relatedCentreRecords.length > 0) {
        return res.status(400).json({
          error: "Cannot delete apostolate because there are dependent records in centre_dtl",
        });
      }
      const deleted = await prisma.apostolates_mst.deleteMany({
        where: {
          apostolate_code,
          centre_type_code,
          province_code: provinceCode,
        },
      });

      if (deleted.count === 0) {
        return res.status(404).json({ error: 'No matching apostolate found to delete.' });
      }
    } else {
      return res.status(400).json({ error: 'Please provide both apostolate_code and centre_type_code.' });
    }

    return res.status(200).json({ message: 'Apostolate deleted successfully.' });
  } catch (error) {
    console.error('Error deleting apostolate:', error);
    return res.status(500).json({ error: 'Failed to delete apostolate' });
  }
};


export const getApostolateNames = sharedQuickCodes(prisma, 'apostl');

export const getCentreTypeNames = sharedQuickCodes(prisma, 'ctrtyp');



export const saveApostolateMapforcenterdetails = async (req, res) => {
  const {
    apostolate_code,
    quickcode_name,  // Name provided in the body
    language_code,
    concurrency_val,
    created_by,
    created_date,
  } = req.body;

  try {
    console.log('Received data:', req.body);
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

    const provinceName = decoded.province_name;
    const createdBy = decoded.role_name || decoded.username || 'Unknown';

    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the given name" });
    }

    const provinceCode = province.province_code;

    // Fetch apostolate_name from quickcode_mst where quick_code_type is 'apostl' and quick_code matches apostolate_code
    const apostolate = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'apostl',
          quick_code: apostolate_code
        }
      }
    });

    if (!apostolate) {
      console.error(`Apostolate code ${apostolate_code} not found`);
      return res.status(404).json({ error: `Apostolate code ${apostolate_code} not found` });
    }

    // Check if the quickcode_name already exists in quickcode_mst
    const duplicateEntry = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type: 'ctrtyp', // For 'ctrtyp' type
        province_code: provinceCode,
        quickcode_name: {
          equals: quickcode_name,
          mode: "insensitive", // Case-insensitive check
        },
      },
    });

    if (duplicateEntry) {
      return res.status(400).json({
        error: `Name '${quickcode_name}' already exists for the type 'ctrtyp' in the province '${provinceName}'.`,
      });
    }

    // Generate the centre_type_code using the same approach as createQuickCode
    const prefix = 'ctr';  // For 'ctrtyp', we use 'ctr' as prefix
    let newQuickCode = `${prefix}001`;

    const existingCodes = await prisma.quickcode_mst.findMany({
      where: { quick_code_type: 'ctrtyp' },
      orderBy: { quick_code: 'desc' },
      take: 1,
    });

    if (existingCodes.length > 0) {
      const lastCode = existingCodes[0].quick_code;
      const lastCodeNumber = parseInt(lastCode.slice(3)) + 1; // Increment the numeric part
      newQuickCode = `${prefix}${String(lastCodeNumber).padStart(3, '0')}`;
    }

    // If quickcode_name is not provided in the body, default it to the generated quick_code
    const centreTypeName = quickcode_name || newQuickCode;

    // Create new centre type in quickcode_mst if it doesn't exist
    let centreType = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'ctrtyp',
          quick_code: newQuickCode
        }
      }
    });

    if (!centreType) {
      console.log(`Centre type ${newQuickCode} not found, creating new centre type`);

      // Centre type not found, create a new entry in quickcode_mst
      centreType = await prisma.quickcode_mst.create({
        data: {
          quick_code_type: 'ctrtyp',
          quick_code: newQuickCode,
          quickcode_name: centreTypeName,  // Use the generated quick code or provided name as the name
          language_code:'en',
          province_code: provinceCode,
          concurrency_val: 1,
          created_by: createdBy,
          created_date: new Date(),
        }
      });

      console.log('Centre type created:', centreType);
    } else {
      console.log('Centre type already exists:', centreType.quickcode_name);
    }

    // Check if the apostolate with the same centre type already exists in apostolates_mst
    const existingRecord = await prisma.apostolates_mst.findFirst({
      where: {
        apostolate_code,
        centre_type_code: newQuickCode,  // Using newQuickCode for centre_type_code
      }
    });

    if (existingRecord) {
      console.error('Duplicate entry: Apostolate with same centre type already exists');
      return res.status(400).json({ error: 'Apostolate with the same centre type already exists' });
    }

    // Ensure created_date is a valid date
    const validCreatedDate = created_date ? new Date(created_date) : new Date();

    // Save to apostolates_mst
    const result = await prisma.apostolates_mst.create({
      data: {
        apostolate_code,
        centre_type_code: newQuickCode, // Using newQuickCode for centre_type_code
        province_code: provinceCode,
        apostolate_name: apostolate.quickcode_name,
        centre_type_name: centreTypeName, // Save the provided or default name
        language_code:'en',
        concurrency_val:1,
        created_by: createdBy,
        created_date: validCreatedDate, // Use the valid created_date
      }
    });

    console.log('Data saved successfully:', result);
    return res.status(201).json({ message: 'Data saved successfully', data: result });
  } catch (error) {
    console.error('Error saving data:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getApostolatebyprovince = async (req, res) => {
  try {
    const { province_code } = req.query;

    if (!province_code) {
      return res.status(400).json({ error: "Province code is required" });
    }

    // Step 1: Fetch Data from `apostolates_mst`
    const apostolates = await prisma.apostolates_mst.findMany({
      where: { province_code },
    });

    const apostolateCodes = apostolates.map((a) => a.apostolate_code);

    // Step 2: Fetch apostolate names
    const apostolateNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: "apostl",
        quick_code: { in: apostolateCodes },
      },
      select: {
        quick_code: true,
        quickcode_name: true,
      },
      orderBy: {
        quickcode_name: "asc",
      },
    });

    // Step 3: Fetch centre type names
    const centreTypeCodes = apostolates.map((a) => a.centre_type_code);
    const centreTypeNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: "ctrtyp",
        quick_code: { in: centreTypeCodes },
      },
      select: {
        quick_code: true,
        quickcode_name: true,
      },
      orderBy: {
        quickcode_name: "asc",
      },
    });

    const centres = await prisma.centre_dtl.findMany({
      where: { apostolate_code: { in: apostolateCodes } },
      select: {
        apostolate_code: true,
        centre_name: true,
        centre_place: true,
      },
    });

    // Step 4: Group data
    const groupedApostolates = apostolates.reduce((acc, apostolate) => {
      const apostolateName = apostolateNames.find(
        (a) => a.quick_code === apostolate.apostolate_code
      );
      const centreTypeName = centreTypeNames.find(
        (c) => c.quick_code === apostolate.centre_type_code
      );

      if (!acc[apostolate.apostolate_code]) {
        acc[apostolate.apostolate_code] = {
          apostolate_code: apostolate.apostolate_code,
          apostolate_name: apostolateName ? apostolateName.quickcode_name : null,
          centre_types: [],
          date_format: apostolate.date_format,
          academic_year: apostolate.academic_year,
          language_code: apostolate.language_code,
          concurrency_val: apostolate.concurrency_val,
          created_by: apostolate.created_by,
          created_date: apostolate.created_date,
          updated_by: apostolate.updated_by,
          updated_date: apostolate.updated_date,
        };
      }

      acc[apostolate.apostolate_code].centre_types.push({
        centre_type_code: apostolate.centre_type_code,
        centre_type_name: centreTypeName ? centreTypeName.quickcode_name : null,
        centres: centres
          .filter((centre) => centre.apostolate_code === apostolate.apostolate_code)
          .map((centre) => ({
            centre_name: centre.centre_name,
            centre_place: centre.centre_place,
          })),
      });

      return acc;
    }, {});

    // Final formatting and sorting
    const formattedApostolates = Object.values(groupedApostolates).sort((a, b) =>
      a.apostolate_name.localeCompare(b.apostolate_name)
    );

    formattedApostolates.forEach((apostolate) => {
      apostolate.centre_types.sort((a, b) =>
        a.centre_type_name.localeCompare(b.centre_type_name)
      );
    });

    res.status(200).json({ data: formattedApostolates });
  } catch (error) {
    console.error("Error fetching apostolates:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};