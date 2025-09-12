import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { JWT_SECRET } from "../../config/index.js";

const prisma = new PrismaClient();



// export const saveProvinceCountryMap = async (req, res) => {
//   const {
//     country_code,
//     inter_province_chk,
//     date_format = null,
//     academic_year = null,
//     language_code = "en",
//     concurrency_val = 1,
//     created_by = "admin",
//     updated_by = "admin",
//   } = req.body;

//   const created_date = new Date();
//   const updated_date = new Date();

//   try {
//     // Validate Token
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "Access token is missing or invalid" });
//     }
//     const token = authHeader.split(" ")[1];

//     // Verify and decode the token
//     let decoded;
//     try {
//       decoded = jwt.verify(token, JWT_SECRET);
//     } catch (error) {
//       if (error.name === "TokenExpiredError") {
//         return res.status(401).json({ error: "Token has expired" });
//       }
//       if (error.name === "JsonWebTokenError") {
//         return res.status(401).json({ error: "Invalid token" });
//       }
//       return res.status(500).json({ error: "Failed to verify token" });
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
//       return res.status(404).json({ error: "Province not found for the logged-in user" });
//     }
    
//     const provinceCode = province.province_code;

//     console.log("Extracted province_code:", provinceCode);

    
//     // Validate Required Fields
//     const missingFields = [];
//     if (!country_code || country_code.trim() === "") {
//       console.error("Missing: country_code");
//       missingFields.push("country_code");
//     }
//     if (!academic_year || academic_year.trim() === "") {
//       console.error("Missing: academic_year");
//       missingFields.push("academic_year");
//     }
//     if (!date_format || date_format.trim() === "") {
//       console.error("Missing: date_format");
//       missingFields.push("date_format");
//     }

//     if (missingFields.length > 0) {
//       console.error("Validation Error: Missing fields:", missingFields.join(", "));
//       console.log("Complete Request Body for Debugging:", req.body);
//       return res.status(400).json({ error: `Missing fields: ${missingFields.join(", ")}` });
//     }

//     const loggedInUser = decoded.username || decoded.name || decoded.user_id || "Unknown";

//     // Verify Province Existence
//     const provinceExists = await prisma.province_mst.findUnique({
//       where: { province_code:provinceCode },
//     });

//     if (!provinceExists) {
//       return res.status(404).json({
//         error: `Province with code ${province_code} not found`,
//       });
//     }

//     // Verify Country Existence
//     const country = await prisma.country_mst.findFirst({
//       where: { country_code },
//     });

//     if (!country) {
//       return res.status(404).json({ error: "Country not found." });
//     }

//     // Check for Existing Mapping
//     const existingMapping = await prisma.province_country_map_mst.findUnique({
//       where: {
//         province_code_country_code: {
//           province_code:provinceCode,
//           country_code,
//         },
//       },
//     });

//     if (existingMapping) {
//       return res.status(409).json({
//         error: "Mapping between province and country already exists",
//       });
//     }

//     // Save Mapping
//     const result = await prisma.province_country_map_mst.create({
//       data: {
//         province_code:provinceCode,
//         country_code,
//         inter_province_chk,
//         date_format,
//         academic_year,
//         language_code,
//         concurrency_val,
//         created_by: loggedInUser,
//         created_date,
//         updated_by: loggedInUser,
//         updated_date,
//       },
//     });

//     console.log("Data saved successfully:", result);
//     return res.status(201).json({ message: "Data saved successfully", data: result });
//   } catch (error) {
//     console.error("Error saving data:", error.message);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };


export const saveProvinceCountryMap = async (req, res) => {
  const {
    country_code,
    inter_province_chk,
    date_format = null,
    academic_year = null,
    language_code = "en",
    concurrency_val = 1,
    created_by = "admin",
    updated_by = "admin",
  } = req.body;

  const created_date = new Date();
  const updated_date = new Date();

  try {
    // Validate Token
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

    // Extract province_name and created_by from the token
    const provinceName = decoded.province_name;
    const loggedInUser = decoded.role_name || decoded.username || 'Unknown';

    // Find the corresponding province_code based on province_name
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the logged-in user" });
    }

    const provinceCode = province.province_code;
    console.log("Extracted province_code:", provinceCode);

    // Verify Province Existence
    const provinceExists = await prisma.province_mst.findUnique({
      where: { province_code: provinceCode },
    });

    if (!provinceExists) {
      return res.status(404).json({
        error: `Province with code ${provinceCode} not found`,
      });
    }

    // Verify Country Existence
    const country = await prisma.country_mst.findFirst({
      where: { country_code },
    });

    if (!country) {
      return res.status(404).json({ error: "Country not found." });
    }

    // Check for Existing Mapping
    const existingMapping = await prisma.province_country_map_mst.findUnique({
      where: {
        province_code_country_code: {
          province_code: provinceCode,
          country_code,
        },
      },
    });

    if (existingMapping) {
      return res.status(409).json({
        error: "Mapping between province and country already exists",
      });
    }

    // Save Mapping
    const result = await prisma.province_country_map_mst.create({
      data: {
        province_code: provinceCode,
        country_code,
        inter_province_chk,
        date_format,
        academic_year,
        language_code,
        concurrency_val,
        created_by: loggedInUser,
        created_date,
        updated_by: loggedInUser,
        updated_date,
      },
    });

    console.log("Data saved successfully:", result);
    return res.status(201).json({ message: "Data saved successfully", data: result });
  } catch (error) {
    console.error("Error saving data:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export const getProvinceCountryMap = async (req, res) => {
  try {
    // Validate Token
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

    // Extract province_name from the token
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

    // Retrieve Province-Country Mapping
    const mappings = await prisma.province_country_map_mst.findMany({
      where: { province_code: provinceCode },
    });

    if (mappings.length === 0) {
      return res.status(404).json({ error: "No mappings found for this province" });
    }

    // Retrieve province and country names separately
    const enrichedMappings = await Promise.all(
      mappings.map(async (mapping) => {
        const country = await prisma.country_mst.findFirst({
          where: { country_code: mapping.country_code },
          select: { country_name: true },
        });

        return {
          ...mapping,
          province_name: provinceName, // Already retrieved from token and query
          country_name: country.country_name ,
        };
      })
    );

    console.log("Retrieved mappings:", enrichedMappings);
    return res.status(200).json({ message: "Mappings retrieved successfully", data: enrichedMappings });
  } catch (error) {
    console.error("Error retrieving data:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};



export const updateProvinceCountryMap = async (req, res) => {
  const {
    country_code, // Updated or new country code
    inter_province_chk,
    date_format = null, // Optional date format
    academic_year = null, // Optional academic year
    language_code = "en", // Default language code
    concurrency_val = 1, // Default concurrency value
    updated_by = "admin", // Updated by field
  } = req.body;

  const updated_date = new Date();

  try {
    // Validate Token
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
      const errorMessage = error.name === "TokenExpiredError" ? "Token has expired" : "Invalid token";
      return res.status(401).json({ error: errorMessage });
    }

    // Extract province_name from the token
    const provinceName = decoded.province_name;
    const loggedInUser = decoded.role_name || decoded.username || "Unknown";

    // Find the corresponding province_code based on province_name
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the logged-in user" });
    }

    const provinceCode = province.province_code;

    // Check if the mapping exists for the current province_code
    const existingMapping = await prisma.province_country_map_mst.findMany({
      where: { province_code: provinceCode },
    });

    if (!existingMapping || existingMapping.length === 0) {
      return res.status(404).json({ error: "Mapping for the province not found" });
    }

    // Delete the existing mapping
    await prisma.province_country_map_mst.deleteMany({
      where: { province_code: provinceCode },
    });

    // Create a new mapping with the updated country_code and fields
    const updatedMapping = await prisma.province_country_map_mst.create({
      data: {
        province_code: provinceCode,
        country_code,
        inter_province_chk,
        date_format,
        academic_year,
        language_code,
        concurrency_val,
        updated_by: loggedInUser,
        updated_date,
      },
    });

    console.log("Mapping updated successfully:", updatedMapping);
    return res.status(200).json({
      message: "Province-Country mapping updated successfully",
      data: updatedMapping,
    });
  } catch (error) {
    console.error("Error updating province-country mapping:", error.message);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};



// export const deleteProvinceCountryMap = async (req, res) => {
//   try {
//     // Validate Token
//     const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "Access token is missing or invalid" });
//     }
//     const token = authHeader.split(" ")[1];

//     // Verify and decode the token
//     let decoded;
//     try {
//       decoded = jwt.verify(token, JWT_SECRET);
//     } catch (error) {
//       if (error.name === "TokenExpiredError") {
//         return res.status(401).json({ error: "Token has expired" });
//       }
//       if (error.name === "JsonWebTokenError") {
//         return res.status(401).json({ error: "Invalid token" });
//       }
//       return res.status(500).json({ error: "Failed to verify token" });
//     }

//     // Extract province_name from the token
//     const provinceName = decoded.province_name;

//     // Find the corresponding province_code based on province_name
//     const province = await prisma.province_mst.findFirst({
//       where: { province_name: provinceName },
//       select: { province_code: true },
//     });

//     if (!province) {
//       return res.status(404).json({ error: "Province not found for the logged-in user" });
//     }

//     const provinceCode = province.province_code;

//     // Verify if there is any mapping to delete
//     const existingMapping = await prisma.province_country_map_mst.findMany({
//       where: { province_code: provinceCode },
//     });

//     if (existingMapping.length === 0) {
//       return res.status(404).json({
//         error: "No mapping exists for the specified province code",
//       });
//     }

//     // Check for dependencies in other tables
//     const dependentTables = [
//       { name: "table1", field: "province_code" },
//       { name: "table2", field: "province_code" },
//       // Add all tables with province_code references here
//     ];

//     for (const table of dependentTables) {
//       const dependency = await prisma[table.name].findMany({
//         where: { [table.field]: provinceCode },
//       });
//       if (dependency.length > 0) {
//         return res.status(400).json({
//           error: `Cannot delete province_code ${provinceCode} because it is used in ${table.name}`,
//         });
//       }
//     }

//     // Delete all mappings for the given province_code
//     await prisma.province_country_map_mst.deleteMany({
//       where: { province_code: provinceCode },
//     });

//     console.log("Mappings deleted successfully for province_code:", provinceCode);
//     return res.status(200).json({
//       message: `All mappings for province_code ${provinceCode} deleted successfully`,
//     });
//   } catch (error) {
//     console.error("Error deleting data:", error.message);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

