import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/index.js";
import { provinceScopeWhere, resolveDataScope, sendScopeError } from '../../utils/dataScope.js';

export const saveDivisionSetup = async (req, res) => {
  const {
    province_code,
    division_type_code,
    division_name,
    language_code = "en", // Default value
    concurrency_val = 1, // Default value
  } = req.body;

  const created_date = new Date(); // Automatically generate the current date

  try {
    // Validate required fields
    if (!division_type_code || !division_name) {
      return res
        .status(400)
        .json({ error: "Required fields: division_type_code, division_name" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];

    // Verify and decode the token
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

    // Extract `province_name` and `created_by` from the token
    const provinceName = decoded.province_name;
    const created_by = decoded.user_id || decoded.username || "Unknown";

    // Find the corresponding province_code based on province_name
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res
        .status(404)
        .json({ error: "Province not found for the logged-in user" });
    }

    const province_code = province.province_code;

    console.log("Received data:", req.body);

    // Fetch division_type_name from quickcode_mst
    const divisionType = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: "divtyp",
          quick_code: division_type_code,
        },
      },
    });

    console.log("Division type lookup result:", divisionType);

    if (!divisionType) {
      console.error(`Division type code ${division_type_code} not found`);
      return res
        .status(404)
        .json({ error: `Division type code ${division_type_code} not found` });
    }

    const existingDivision = await prisma.division_setup_mst.findFirst({
      where: {
          province_code,
          division_type_code,
          division_name: {
            equals: division_name,
            mode: 'insensitive', // Case-insensitive comparison
        },
      }
  });

  if (existingDivision) {
      return res.status(400).json({ error: 'Division name already exists for this province and division type' });
  }

    // Fetch the highest existing division_code
    const lastDivision = await prisma.division_setup_mst.findFirst({
      where: {
        province_code,
        division_type_code,
      },
      orderBy: {
        division_code: "desc",
      },
    });

    // Generate the new division_code
    let newDivisionCode = "D1";
    if (lastDivision) {
      const lastCodeNumber = parseInt(
        lastDivision.division_code.replace(/^\D+/g, "")
      ); // Extract the number after 'D'
      newDivisionCode = `D${lastCodeNumber + 1}`;
    }

    // Save to division_setup_mst
    const result = await prisma.division_setup_mst.create({
      data: {
        province_code,
        division_type_code,
        division_code: newDivisionCode,
        division_name,
        language_code,
        concurrency_val,
        created_by,
        created_date,
      },
    });

    console.log("Data saved successfully:", result);
    return res
      .status(201)
      .json({ message: "Data saved successfully", data: result });
  } catch (error) {
    console.error("Error saving data:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};





export const getDivisions = async (req, res) => {
  try {
    const { provinceCodes } = await resolveDataScope(req, prisma, req.query.province_code || null);
    const [divisions, provinces, divisionTypes] = await Promise.all([
      prisma.division_setup_mst.findMany({ where: provinceScopeWhere(provinceCodes), orderBy: { division_name: 'asc' } }),
      prisma.province_mst.findMany({ select: { province_code: true, province_name: true } }),
      prisma.quickcode_mst.findMany({ where: { quick_code_type: 'divtyp' }, select: { quick_code: true, quickcode_name: true } }),
    ]);
    const provinceNames = Object.fromEntries(provinces.map((row) => [row.province_code, row.province_name]));
    const typeNames = Object.fromEntries(divisionTypes.map((row) => [row.quick_code, row.quickcode_name]));
    res.json({ data: divisions.map((row) => ({
      ...row,
      province_name: provinceNames[row.province_code] || null,
      division_type_name: typeNames[row.division_type_code] || null,
    })) });
  } catch (error) {
    console.error("Error fetching divisions:", error);
    sendScopeError(res, error, "Internal Server Error");
  }
};


  
  export const updateDivisionSetup = async (req, res) => {
    const { province_code, division_type_code, division_code } = req.params;
    const {
      division_name,
      division_type_code: new_division_type_code, // Map to handle new division_type_code
      language_code = 'en',
      concurrency_val = 1,
      updated_date = new Date(),
    } = req.body;
  
    try {
      // Authenticate the request
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
      const updated_by = decoded.user_id || decoded.username || "Unknown";
      console.log("Authenticated user:", decoded);
      console.log('Received data for update:', { province_code, division_type_code, division_code }, req.body);
  
      const existingDivision = await prisma.division_setup_mst.findUnique({
        where: {
          province_code_division_type_code_division_code: {
            province_code,
            division_type_code,
            division_code,
          },
        },
      });
  
      if (!existingDivision) {
        console.error(`Division with code ${division_code} not found`);
        return res.status(404).json({ error: `Division with code ${division_code} not found` });
      }

      const duplicateDivision = await prisma.division_setup_mst.findFirst({
        where: {
            province_code,
            division_type_code,
            division_name: {
              equals: division_name,
              mode: 'insensitive', // Case-insensitive comparison
          },
            division_code: { not: division_code }, // Exclude the current division being updated
        },
    });

    if (duplicateDivision) {
        console.error(`Division name  already exists for this province and division type`);
        return res.status(400).json({ error: `Division name  already exists for this province and division type` });
    }
  
      // Check if a record with new_division_type_code already exists
      // const conflictingDivision = await prisma.division_setup_mst.findUnique({
      //   where: {
      //     province_code_division_type_code_division_code: {
      //       province_code,
      //       division_type_code: new_division_type_code,
      //       division_code,
      //     },
      //   },
      // });
  
      // if (conflictingDivision) {
      //   console.error(
      //     `Conflict: A record with division_code ${division_code} and new division_type_code ${new_division_type_code} already exists`
      //   );
      //   return res.status(409).json({
      //     error: `Conflict: A record with the same province_code, division_code, and new division_type_code already exists.`,
      //   });
      // }
  
      let result;
      if (new_division_type_code && new_division_type_code !== division_type_code) {
        // Delete the old record
        await prisma.division_setup_mst.delete({
          where: {
            province_code_division_type_code_division_code: {
              province_code,
              division_type_code,
              division_code,
            },
          },
        });
  
        // Create a new record with the updated division_type_code
        result = await prisma.division_setup_mst.create({
          data: {
            province_code,
            division_type_code: new_division_type_code,
            division_code,
            division_name,
            language_code,
            concurrency_val,
            updated_by,
            updated_date,
          },
        });
      } else {
        // Update the existing record
        result = await prisma.division_setup_mst.update({
          where: {
            province_code_division_type_code_division_code: {
              province_code,
              division_type_code,
              division_code,
            },
          },
          data: {
            division_name,
            language_code,
            concurrency_val,
            updated_by,
            updated_date,
          },
        });
      }
  
      console.log('Data updated successfully:', result);
      return res.status(200).json({ message: 'Data updated successfully', data: result });
    } catch (error) {
      console.error('Error updating data:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  
  
  export const deleteDivisionSetup = async (req, res) => {
    const { province_code, division_type_code, division_code } = req.params;
  
    try {

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
      console.log('Received data for deletion:', req.params);
  
      const existingDivision = await prisma.division_setup_mst.findUnique({
        where: {
          province_code_division_type_code_division_code: {
            province_code,
            division_type_code,
            division_code
          }
        }
      });
  
      if (!existingDivision) {
        console.error(`Division with code ${division_code} not found`);
        return res.status(404).json({ error: `Division with code ${division_code} not found `});
      }

      const dependencies = await Promise.all([
        // (await prisma.division_setup_mst.findFirst({ where: { division_code,division_type_code, province_code } })) ? "division_setup_mst" : null,
        (await prisma.headquarters_dtl.findFirst({ where: { division_code,division_type_code, province_code } })) ? "headquarters_dtl" : null,
        (await prisma.community_house_dtl.findFirst({ where: { division_code,division_type_code, province_code } })) ? "community_house_dtl" : null,
        (await prisma.centre_dtl.findFirst({ where: { division_code,division_type_code, province_code } })) ? "centre_dtl" : null,
        (await prisma.curia_advisors_dtl.findFirst({ where: { division_code,division_type_code, province_code } })) ? "curia_advisors_dtl" : null,
        (await prisma.appoint_transfer_dtl.findFirst({ where: { division_code,division_type_code, province_code } })) ? "appoint_transfer_dtl" : null,
        (await prisma.scholastics_admisn_promon_dtl.findFirst({ where: { division_code,division_type_code, province_code } })) ? "scholastics_admisn_promon_dtl" : null,
        (await prisma.announcements_dtl.findFirst({ where: { division_code,division_type_code, province_code } })) ? "announcements_dtl" : null,
      ]);
  
      const foundDependencies = dependencies.filter(dep => dep !== null);
  
      if (foundDependencies.length > 0) {
        console.info(`Dependency found for division_code: ${division_code} in the following tables: ${foundDependencies.join(", ")}`);
        return res.status(400).json({ error: `Cannot delete: Division  code is referenced in other tables (${foundDependencies.join(", ")}).` });
      }
  
  
      const result = await prisma.division_setup_mst.delete({
        where: {
          province_code_division_type_code_division_code: {
            province_code,
            division_type_code,
            division_code
          }
        }
      });
  
      console.log('Data deleted successfully:', result);
      return res.status(200).json({ message: 'Data deleted successfully', data: result });
    } catch (error) {
      console.error('Error deleting data:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  export const getDivisionByProvinceAndType = async (req,res) => {
    
    const { province_code, division_type_code } = req.params;
    try {
      // Fetch the division code and division name based on province_code and division_type_code
      const divisions = await prisma.division_setup_mst.findMany({
        where: {
          province_code: province_code,
          division_type_code: division_type_code,
        },
        select: {
          division_code: true,
          division_name: true,
        },
      });
  
      if (divisions.length === 0) {
        return res.status(400).json({ message: 'No divisions found for the given province and division type.'});
      }
  
      return res.status(200).json({ message: 'Divisions retrieved successfully', data: divisions})
    } catch (error) {
      console.error('Error fetching divisions:', error);
      throw new Error('Could not fetch division details.');
    }
  };
