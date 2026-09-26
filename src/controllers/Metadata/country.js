import { listISDCodes } from '../../services/isdCodes.js';
import { provinceScopeWhere, resolveDataScope, sendScopeError } from '../../utils/dataScope.js';
import { PrismaClient } from '@prisma/client';
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/index.js";

const prisma = new PrismaClient();

export const saveCountryData = async (req, res) => {
  console.log('saveCountryData route hit');

  try {
    const { country_name, alpha_3code: country_code, ISD_code, language_code, concurrency_val } = req.body;

    // Extract token from headers
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

    const createdBy = decoded.role_name || decoded.username || 'Unknown';
    const provinceCode = decoded.province_code || 'ALL';

    // Check if country_code already exists in the country_mst table
    const existingCountry = await prisma.country_mst.findUnique({
      where: {
        country_code_province_code: {
          country_code,
          province_code: provinceCode,
        },
      },
    });

    if (existingCountry) {
      return res.status(400).json({ message: `Country with code '${country_code}' already exists for this province.` });
    }

    // Prepare data for insertion
    const data = {
      province_code: provinceCode,
      country_code,
      country_name,
      ISD_code,
      language_code: language_code || 'en', // Optional field
      concurrency_val: concurrency_val || 1, // Default value if not provided
      created_by: createdBy, // Set created_by from token
      created_date: new Date(),
      updated_by: createdBy, // Set updated_by from token
      updated_date: new Date(),
    };

    // Save to country_mst table
    await prisma.country_mst.create({
      data: data,
    });

    res.status(200).json({ message: 'Country data saved successfully.' });
  } catch (error) {
    console.error('Error saving country data:', error);
    res.status(500).json({ error: 'Failed to save country data' });
  } finally {
    await prisma.$disconnect();
  }
};

export const getCountryData = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }
    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    const provinceCode = decoded.province_code || 'ALL';

    // Fetch all data from the country_mst table for the user's province
    const countryData = await prisma.country_mst.findMany({
      where: { province_code: provinceCode },
    });

    res.status(200).json(countryData);
  } catch (error) {
    console.error('Error fetching country data:', error);
    res.status(500).json({ error: 'Failed to fetch country data' });
  } finally {
    await prisma.$disconnect();
  }
};

export const deleteCountry = async (req, res) => {
  const { country_code } = req.query;

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

    const countryExists = await prisma.country_mst.findFirst({
      where: {
        country_code,
        province_code: provinceCode, // Ensure the country belongs to the correct province
      },
    });

    if (!countryExists) {
      return res.status(404).json({ error: "Country not found in the specified province." });
    }

    // Step 3: Check if the country is used in related tables
    const tablesToCheck = [
      "state_mst",
      "headquarters_dtl",
      "centre_dtl",
    ];

    for (const table of tablesToCheck) {
      const isCountryInUse = await prisma[table].findFirst({
        where: {
          country_code,
          province_code: provinceCode, // Ensure both fields match
        },
      });
      if (isCountryInUse) {
        return res.status(400).json({
          message: `Country cannot be deleted as it is being used in the MSFS Profile table: ${table} for province_code: ${provinceCode}.`,
        });
      }
    }

    // Step 4: Check if the country_code is used in the `obituary_dtl` table
    const isOriginCountryInUse = await prisma.obituary_dtl.findFirst({
      where: {
        orgin_country_code: country_code,
        province_code: provinceCode, // Ensure both fields match
      },
    });

    if (isOriginCountryInUse) {
      return res.status(400).json({
        message: "Country cannot be deleted as it is being used in the obituary_dtl table's origin_country_code.",
      });
    }

    // Delete the country for the given country_code and province_code
    await prisma.country_mst.delete({
      where: {
        country_code_province_code: {
          country_code,
          province_code: provinceCode,
        },
      },
    });

    res.status(200).json({ message: 'Country deleted successfully.' });
  } catch (error) {
    console.error('Error deleting country:', error);
    res.status(500).json({ error: 'Failed to delete country' });
  } finally {
    await prisma.$disconnect();
  }
};
export const getCountryDetails = async (req, res) => {
  const { alpha_3code } = req.query;
  if (!alpha_3code) return res.status(400).json({ error: 'alpha_3code is required.' });

  try {
    const countryDetails = await prisma.countrymetadata.findUnique({
      where: { alpha_3code },
      select: {
        country_name: true,
        alpha_3code: true,
        ISD_code: true,
      },
    });

    if (!countryDetails) {
      return res.status(404).json({ message: "Country not found." });
    }

    res.status(200).json(countryDetails);
  } catch (error) {
    console.error('Error fetching country details:', error);
    res.status(500).json({ message: 'Error fetching country details.', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

export const listCountries = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch list of countries for the user's province
    const countries = await prisma.countrymetadata.findMany({
      // where: { province_code: provinceCode },
      select: {
        country_name: true,
        alpha_3code: true,
      },
    });

    if (!countries || countries.length === 0) {
      return res.status(404).json({ message: 'No countries found for this province.' });
    }

    res.status(200).json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ message: 'Error fetching countries.', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

export const getISDCodes = async (req, res) => {
  const { country_code} = req.query;
  try {
    // Validate access, but dialing codes are shared reference data, not province data.
    await resolveDataScope(req, prisma, req.query.province_code);
    const isdCodes = await listISDCodes(prisma, country_code);

    if (!isdCodes || isdCodes.length === 0) {
      return res.status(404).json({ message: 'No ISD codes found.' });
    }

    res.status(200).json(isdCodes);
  } catch (error) {
    console.error('Error fetching ISD codes:', error);
    return sendScopeError(res, error, 'Error fetching ISD codes.');
  } finally {
    await prisma.$disconnect();
  }
};


export const CountriesListFromMetadata = async (req, res) => {
  try {
    // Authentication logic
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Fetch countries if authenticated
    const countries = await prisma.countrymetadata.findMany({
      select: {
        country_name: true,
        alpha_3code: true,
        ISD_code: true,
      },
    });

    if (!countries || countries.length === 0) {
      return res.status(404).json({ message: "No countries found." });
    }

    res.status(200).json(countries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ message: "Error fetching countries.", error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

export const getAllISDCodes = async (req, res) => {
  console.log('getISDCodes route hit');

  try {
    const isdCodes = await listISDCodes(prisma, req.query.country_code);

    // Check if any ISD codes were found
    if (!isdCodes || isdCodes.length === 0) {
      return res.status(404).json({ message: 'No ISD codes found.' });
    }

    // Send a success response with the ISD codes
    res.status(200).json(isdCodes);
  } catch (error) {
    console.error('Error fetching ISD codes:', error);

    // Send an error response
    res.status(500).json({ message: 'Error fetching ISD codes.', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};



export const getCountrybyProvine = async (req, res) => {
  try {
    const { province_code } = req.query;

    if (!province_code) {
      return res.status(400).json({ error: "Province code is required" });
    }

    // Fetch all country data for the provided province code
    const countryData = await prisma.country_mst.findMany({
      where: { province_code },
    });

    if (!countryData.length) {
      return res.status(404).json({ message: "No country data found for this province" });
    }

    res.status(200).json(countryData);
  } catch (error) {
    console.error("❌ Error fetching country data:", error);
    res.status(500).json({ error: "Failed to fetch country data" });
  } finally {
    await prisma.$disconnect();
  }
};