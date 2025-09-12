import { PrismaClient } from '@prisma/client';
import { JWT_SECRET } from "../../config/index.js";
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";

export const saveStateData = async (req, res) => {
  console.log('saveStateData route hit');
  console.log('Request body:', req.body);

  try {
    const { state_code, country_code, state_name, ISD_code, language_code, concurrency_val, created_by } = req.body;

    // Check if required fields are provided
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
    const createdBy = decoded.role_name || decoded.username || 'Unknown';

    // Validate required fields
    if (!state_code || !country_code ) {
      return res.status(400).json({ message: 'state_code and country_code are required.' });
    }

    // Find the corresponding province_code based on province_name
    const province = await prisma.province_mst.findFirst({
      where: { province_name:provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the given name" });
    }
    const provinceCode = province.province_code;

    // Check if the state already exists in the state_mst table
    const existingState = await prisma.state_mst.findUnique({
      where: {
        state_code_country_code_province_code: {
          state_code,
          country_code,
          province_code: provinceCode,
        },
      },
    });

    if (existingState) {
      return res.status(400).json({ message: `State with code ${state_code} already exists in country ${country_code}.` });
    }

    // Prepare data for insertion
    const data = {
      state_code,
      country_code,
      province_code: provinceCode,
      state_name,
      ISD_code,
      language_code: language_code || "en", // Optional field
      concurrency_val: concurrency_val || 1, // Default value if not provided
      created_by: createdBy, // Default to 'system' if not provided
      created_date: new Date(),
      updated_by: createdBy, // Default to 'system' if not provided
      updated_date: new Date(),
    };

    // Save to state_mst table
    await prisma.state_mst.create({
      data: data,
    });

    // Send a success response
    res.status(200).json({ message: 'State data saved successfully.' });
  } catch (error) {
    console.error('Error saving state data:', error);

    // Send an error response
    res.status(500).json({ message: 'Error saving state data.', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

export const getStateData = async (req, res) => {
  console.log('getStateData route hit');
  console.log('Request query:', req.query);

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

    const { state_code, country_code } = req.query;

    let stateData;
    if (state_code && country_code) {
      // Fetch the state data from the state_mst table
      stateData = await prisma.state_mst.findUnique({
        where: {
          state_code_country_code: {
            state_code,
            country_code,
          },
        },
      });

      if (!stateData) {
        return res.status(404).json({ message: `State with code ${state_code} not found in country ${country_code}.` });
      }
    } else {
      // Fetch all state data if no query parameters are provided
      stateData = await prisma.state_mst.findMany({
        where: { province_code: provinceCode },
      });
    }

    // Send a success response with the fetched data
    res.status(200).json(stateData);
  } catch (error) {
    console.error('Error fetching state data:', error);

    // Send an error response
    res.status(500).json({ message: 'Error fetching state data.', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};
export const deleteStateData = async (req, res) => {
  const { state_code } = req.query

  if (!state_code) {
    return res.status(400).json({
      message: "state_code is required.",
    });
  }

  try {
    // Step 1: Check if the state exists with the provided state_code
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
    const createdBy = decoded.role_name || decoded.username || 'Unknown';

    // Find the corresponding province_code based on province_name
    const province = await prisma.province_mst.findFirst({
      where: { province_name:provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the given name" });
    }
    const provinceCode = province.province_code;

    // Step 1: Check if the state exists within the province
    const stateExists = await prisma.state_mst.findFirst({
      where: { state_code, province_code: provinceCode },
    });

    if (!stateExists) {
      return res.status(404).json({
        message: `State with code ${state_code} does not exist in the province ${provinceName}.`,
      });
    }

    // Step 2: Check for references in related tables
    const tablesToCheck = ['centre_dtl', 'headquarters_dtl'];
    for (const table of tablesToCheck) {
      const isStateInUse = await prisma[table].findFirst({
        where: { state_code },
      });
      if (isStateInUse) {
        return res.status(400).json({
          message: `State cannot be deleted as it is being used in the MSFS Profile table: ${table}.`,
        });
      }
    }

    // Step 3: Check for usage in specific columns of headquarters_dtl
    const isOrginStateInUse = await prisma.headquarters_dtl.findFirst({
      where: {
        OR: [
          { courier_state_code: state_code },
          { other_state_code: state_code }
        ]
      },
    });

    if (isOrginStateInUse) {
      return res.status(400).json({
        message: "State cannot be deleted as it is being used in the headquarters_dtl table's courier_state_code or other_state_code.",
      });
    }

    // Step 4: Delete the state using deleteMany
    await prisma.state_mst.deleteMany({
      where: { state_code },
    });

    res.status(200).json({ message: 'State deleted successfully.' });

  } catch (error) {
    console.error('Error deleting state:', error);
    res.status(500).json({
      message: 'Error deleting state.',
      error: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
};



export const getStatesByCountryCode = async (req, res) => {
  console.log('getStatesByCountryCode route hit');
  console.log('Request query:', req.params);

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

    const { country_code } = req.params;

    // Fetch states by country code
    const stateData = await prisma.state_mst.findMany({
      where: {
        country_code: country_code,province_code:provinceCode
      },
    });

    if (stateData.length === 0) {
      return res.status(404).json({ message: `No states found for country code ${country_code}.` });
    }

    // Send a success response with the fetched data
    res.status(200).json(stateData);
  } catch (error) {
    console.error('Error fetching states by country code:', error);

    // Send an error response
    res.status(500).json({ message: 'Error fetching states by country code.', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};

export const getStatesByCountrybyProvince = async (req, res) => {
  console.log('✅ getStatesByCountryCode route hit');
  console.log('Request query:', req.query);

  try {
    const { country_code, province_code } = req.query;

    // Validate required parameters
    if (!country_code || !province_code) {
      return res.status(400).json({ error: 'Both country_code and province_code are required' });
    }

    // Fetch states by country_code and province_code
    const stateData = await prisma.state_mst.findMany({
      where: {
        country_code: country_code,
        province_code: province_code,
      },
    });

    if (stateData.length === 0) {
      return res.status(404).json({ message: `No states found for country code ${country_code} and province ${province_code}` });
    }

    // Respond with fetched states
    res.status(200).json(stateData);
  } catch (error) {
    console.error('❌ Error fetching states:', error);
    res.status(500).json({ message: 'Error fetching states by country code', error: error.message });
  } finally {
    await prisma.$disconnect();
  }
};