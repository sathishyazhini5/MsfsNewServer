import { saveCentreExcelRow } from '../../utils/centreExcelUpload.js';
import { recordWhere } from '../../utils/recordAccess.js';
import { estatusRecordWhere } from '../../utils/estatusAccess.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import xlsx from 'xlsx';
import fs from 'fs'
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/index.js";
import { provinceScopeWhere, resolveDataScope, sendScopeError } from '../../utils/dataScope.js';

export const saveCentreDetails = async (req, res) => {
  const {
    province_code,
    division_type_code,
    division_code,
    apostolate_code,
    centre_type_code,
    community_house_code,
    centre_name,
    centre_place,
    address1,
    address2,
    address3,
    city_dist,
    pin_zipcode,
    country_code,
    state_code,
    diocese_code,
    phone1_isd,
    phone1_no,
    phone2_isd,
    phone2_no,
    phone3_isd,
    phone3_no,
    watsup_isd,
    watsup_no,
    office_mailid1,
    office_mailid2,
    office_mailid3,
    website1,
    website2,
    website3,
    language_code = 'en', // Default value
    concurrency_val = 1,  // Default value
    created_by, // Default value

  } = req.body;

  const created_date = new Date(); // Automatically generate the current date

  console.log('Received data:', req.body);
  const pinZipcodeInt = parseInt(pin_zipcode, 10);

  // Handle cases where conversion fails
  if (isNaN(pinZipcodeInt)) {
    return res.status(400).json({ error: 'Invalid pin_zipcode format. It must be a number.' });
  }

  try {
    // Extract the authorization token from headers and validate it
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
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

    // Get the logged-in user's province_code from decoded JWT
    const { province_code: loggedProvinceCode } = decoded;
    const createdBy = decoded.role_name || decoded.username || "Unknown";
    const finalProvinceCode = province_code || loggedProvinceCode;
    if (!finalProvinceCode) {
      return res.status(400).json({ error: "Province code is required and not available" });
    }

    // Validate required fields
    const missingFields = [];

    if (!division_type_code) missingFields.push('division_type_code');
    if (!division_code) missingFields.push('division_code');
    if (!apostolate_code) missingFields.push('apostolate_code');
    if (!centre_type_code) missingFields.push('centre_type_code');
    if(! diocese_code) missingFields.push('diocese_code');
    if (!community_house_code) missingFields.push('community_house_code');
    if (!centre_name) missingFields.push('centre_name');
    if (!centre_place) missingFields.push('centre_place');
    if (!address1) missingFields.push("Address 1");
    if (!address2) missingFields.push("Place");
    if (!pin_zipcode) missingFields.push("Pin/Zip Code");
    if (!city_dist) missingFields.push("City/District");
    if (!country_code) missingFields.push("Country Code");
    if (!state_code) missingFields.push("State Code");
    if(!phone1_no)missingFields.push("Phone Number1");
    if(!phone1_isd)missingFields.push("Phone isd 1")
    if(!office_mailid1)missingFields.push("Office Mailid1")
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
        fields: missingFields, // List of missing fields for further use
      });
    }


    // Validate and fetch the diocese_code based on the provided diocese_code
    const diocese = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type: 'diocse',
        quick_code: diocese_code
      }
    });

    if (!diocese) {
      console.error(`Diocese code ${diocese_code} not found`);
      return res.status(404).json({ error: `Diocese code ${diocese_code} not found` });
    }
    const dioceseName = diocese.quickcode_name;

    console.log(`Diocese name: ${dioceseName}`);

    // Validate country_code
    const country = await prisma.country_mst.findFirst({
      where: { country_code }
    });

    if (!country) {
      console.error(`Country code ${country_code} not found`);
      return res.status(404).json({ error: `Country code ${country_code} not found` });
    }

    // Validate state_code
    const state = await prisma.state_mst.findFirst({
      where: { state_code }
    });

    if (!state) {
      console.error(`State code ${state_code} not found`);
      return res.status(404).json({ error: `State code ${state_code} not found` });
    }

    // Check if province_code is present in province_mst
    const province = await prisma.province_mst.findFirst({
      where: { province_code }
    });

    if (!province) {
      console.error(`Province code ${province_code} not found`);
      return res.status(404).json({ error: `Province code ${province_code} not found` });
    }

    // Check if division_type_code is present in quickcode_mst
    const divisionType = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'divtyp',
          quick_code: division_type_code
        }
      }
    });

    if (!divisionType) {
      console.error(`Division type code ${division_type_code} not found`);
      return res.status(404).json({ error: `Division type code ${division_type_code} not found` });
    }

    // Check if division_code is present in division_setup_mst
    const division = await prisma.division_setup_mst.findFirst({
      where: {
        division_code,
        province_code,
        division_type_code,
      },
    });

    if (!division) {
      console.error(`Division code ${division_code} not found for the provided province and division type`);
      return res.status(404).json({ error: `Division code ${division_code} not found for the provided province and division type` });
    }

    // Check if the apostolate_code and centre_type_code match in apostolate_mst
    const apostolate = await prisma.apostolates_mst.findFirst({
      where: {
        apostolate_code,
        centre_type_code
      }
    });

    if (!apostolate) {
      console.error(`Apostolate code ${apostolate_code} with Centre type code ${centre_type_code} not found`);
      return res.status(404).json({ error: `Apostolate code ${apostolate_code} with Centre type code ${centre_type_code} not found` });
    }

    // Check if community_house_code is present in community_house_dtl
    const communityHouse = await prisma.community_house_dtl.findFirst({
      where: { community_house_code }
    });

    if (!communityHouse) {
      console.error(`Community house code ${community_house_code} not found`);
      return res.status(404).json({ error: `Community house code ${community_house_code} not found` });
    }

    // Fetch the highest existing centre_code
    const lastCentre = await prisma.centre_dtl.findFirst({
      orderBy: {
        centre_code: 'desc'
      }
    });

    // Generate the new centre_code
    let newCentreCode = 'CEN001';
    if (lastCentre) {
      const lastCodeNumber = parseInt(lastCentre.centre_code.replace('CEN', ''), 10);
      newCentreCode = `CEN${(lastCodeNumber + 1).toString().padStart(3, '0')}`;
    }


    // Save to centre_dtl
    const result = await prisma.centre_dtl.create({
      data: {
        centre_code: newCentreCode,
        province_code: finalProvinceCode,
        division_type_code,
        diocese_code,
        division_code,
        apostolate_code,
        centre_type_code,
        community_house_code,
        centre_name,
        centre_place,
        address1,
        address2:address2 ? address2.trim().toUpperCase() : null,
        address3,
        city_dist,
        pin_zipcode: pinZipcodeInt,
        country_code,
        state_code,
        diocese_code,
        phone1_isd,
        phone1_no,
        phone2_isd,
        phone2_no,
        phone3_isd,
        phone3_no,
        watsup_isd,
        watsup_no,
        office_mailid1,
        office_mailid2,
        office_mailid3,
        website1,
        website2,
        website3,
        language_code,
        concurrency_val,
        created_by: res.locals.user?.user_id || createdBy,
        created_date,
      }
    });

    // Convert BigInt fields to string before returning
    const resultToReturn = {
      ...result,
      phone1_no: result.phone1_no.toString(),
      phone2_no: result.phone2_no ? result.phone2_no.toString() : null,
      phone3_no: result.phone3_no ? result.phone3_no.toString() : null,
      mobile1_no: result.mobile1_no ? result.mobile1_no.toString() : null,
      mobile2_no: result.mobile2_no ? result.mobile2_no.toString() : null,
      mobile3_no: result.mobile3_no ? result.mobile3_no.toString() : null,
      watsup_no: result.watsup_no ? result.watsup_no.toString() : null,
      fax_no: result.fax_no ? result.fax_no.toString() : null
    };

    console.log('Data saved successfully:', resultToReturn);
    return res.status(201).json({ message: 'Data saved successfully', data: resultToReturn });
  }
  catch (error) {
    console.error('Error saving data:', error); // Logs the full error object
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }

};


export const getCentreDetails = async (req, res) => {
  try {
    const { provinceCodes } = await resolveDataScope(req, prisma, req.query.province_code || null);
    // Fetch all records from centre_dtl
    const centres = await prisma.centre_dtl.findMany({
      where: provinceScopeWhere(provinceCodes),
    });

    if (!centres.length) {
      return res.status(200).json({ message: "No centre details found", data: [] });
    }

    // Fetch related names for each centre using raw SQL
    const centresWithNames = await Promise.all(
      centres.map(async (centre) => {

        const [province] = await prisma.$queryRaw`
                    SELECT province_name 
                    FROM province_mst 
                    WHERE province_code = ${centre.province_code}`;

        // Fetch division name by matching province_code, division_type_code, and division_code
        const [division] = await prisma.$queryRaw`
                    SELECT division_name 
                    FROM division_setup_mst 
                    WHERE province_code = ${centre.province_code} 
                    AND division_type_code = ${centre.division_type_code} 
                    AND division_code = ${centre.division_code}`;

        const [apostolate] = await prisma.$queryRaw`
                    SELECT apostolate_name 
                    FROM apostolates_mst 
                    WHERE apostolate_code = ${centre.apostolate_code}`;

        const [centreType] = await prisma.$queryRaw`
                    SELECT quickcode_name 
                    FROM quickcode_mst 
                    WHERE quick_code_type = 'ctrtyp' 
                    AND quick_code = ${centre.centre_type_code}`;

        const [communityHouse] = await prisma.$queryRaw`
                    SELECT community_house_name 
                    FROM community_house_dtl 
                    WHERE community_house_code = ${centre.community_house_code}`;

        const [country] = await prisma.$queryRaw`
                    SELECT country_name 
                    FROM country_mst 
                    WHERE country_code = ${centre.country_code}`;

        const [state] = await prisma.$queryRaw`
                    SELECT state_name 
                    FROM state_mst 
                    WHERE state_code = ${centre.state_code}`;

        const [diocese] = await prisma.$queryRaw`
                    SELECT quickcode_name 
                    FROM quickcode_mst 
                    WHERE quick_code = ${centre.diocese_code}`;

        // Return the centre details along with the fetched names
        return {
          ...centre,
          province_name: province?.province_name || null,
          division_name: division?.division_name || null,
          apostolate_name: apostolate?.apostolate_name || null,
          centre_type_name: centreType?.quickcode_name || null,
          community_house_name: communityHouse?.community_house_name || null,
          country_name: country?.country_name || null,
          state_name: state?.state_name || null,
          diocese_name: diocese?.quickcode_name || null,
          phone1_no: centre.phone1_no ? centre.phone1_no.toString() : null,
          phone2_no: centre.phone2_no ? centre.phone2_no.toString() : null,
          phone3_no: centre.phone3_no ? centre.phone3_no.toString() : null,
          mobile1_no: centre.mobile1_no ? centre.mobile1_no.toString() : null,
          mobile2_no: centre.mobile2_no ? centre.mobile2_no.toString() : null,
          mobile3_no: centre.mobile3_no ? centre.mobile3_no.toString() : null,
          watsup_no: centre.watsup_no ? centre.watsup_no.toString() : null,
          fax_no: centre.fax_no ? centre.fax_no.toString() : null
        };
      })
    );
    console.log(centres)
    return res.status(200).json({ message: 'Fetched all centre details successfully', data: centresWithNames });
  } catch (error) {
    console.error('Error fetching centre details:', error.message);
    return sendScopeError(res, error, 'Internal Server Error');
  }
};


export const getCentreDetail = async (req, res) => {
  const { province_code } = req.params;

  try {
    // Fetch all records from centre_dtl filtered by province_code
    const centres = await prisma.centre_dtl.findMany({
      where: province_code ? { province_code } : {}
    });

    if (!centres.length) {
      return res.status(200).json({ message: 'No centre details found', data: [] });
    }

    // Fetch related names for each centre using raw SQL
    const centresWithNames = await Promise.all(
      centres.map(async (centre) => {
        const [province] = await prisma.$queryRaw`
                  SELECT province_name 
                  FROM province_mst 
                  WHERE province_code = ${centre.province_code}`;

        const [division] = await prisma.$queryRaw`
                  SELECT division_name 
                  FROM division_setup_mst 
                  WHERE division_code = ${centre.division_code}`;

        const [apostolate] = await prisma.$queryRaw`
                  SELECT apostolate_name 
                  FROM apostolates_mst 
                  WHERE apostolate_code = ${centre.apostolate_code}`;

        const [centreType] = await prisma.$queryRaw`
                  SELECT quickcode_name 
                  FROM quickcode_mst 
                  WHERE quick_code_type = 'ctrtyp' 
                  AND quick_code = ${centre.centre_type_code}`;

        // const [communityHouse] = await prisma.$queryRaw`
        //     SELECT commutity_house_name 
        //     FROM community_house_dtl 
        //     WHERE community_house_code = ${centre.community_house_code}`;

        const [country] = await prisma.$queryRaw`
                  SELECT country_name 
                  FROM country_mst 
                  WHERE country_code = ${centre.country_code}`;

        const [state] = await prisma.$queryRaw`
                  SELECT state_name 
                  FROM state_mst 
                  WHERE state_code = ${centre.state_code}`;

        const [diocese] = await prisma.$queryRaw`
                  SELECT quickcode_name 
                  FROM quickcode_mst 
                  WHERE quick_code = ${centre.diocese_code}`;

        // Return the centre details along with the fetched names
        return {
          ...centre,
          province_name: province?.province_name || null,
          division_name: division?.division_name || null,
          apostolate_name: apostolate?.apostolate_name || null,
          centre_type_name: centreType?.quickcode_name || null,
          // community_house_name: communityHouse?.commutity_house_name || null,
          country_name: country?.country_name || null,
          state_name: state?.state_name || null,
          diocese_name: diocese?.quickcode_name || null,
          phone1_no: centre.phone1_no ? centre.phone1_no.toString() : null,
          phone2_no: centre.phone2_no ? centre.phone2_no.toString() : null,
          phone3_no: centre.phone3_no ? centre.phone3_no.toString() : null,
          mobile1_no: centre.mobile1_no ? centre.mobile1_no.toString() : null,
          mobile2_no: centre.mobile2_no ? centre.mobile2_no.toString() : null,
          mobile3_no: centre.mobile3_no ? centre.mobile3_no.toString() : null,
          watsup_no: centre.watsup_no ? centre.watsup_no.toString() : null,
          fax_no: centre.fax_no ? centre.fax_no.toString() : null
        };
      })
    );

       // Sorting centres alphabetically by 'centre_place'
       centresWithNames.sort((a, b) => a.centre_place.localeCompare(b.centre_place));
       

    return res.status(200).json({ message: 'Fetched all centre details successfully', data: centresWithNames });
  } catch (error) {
    console.error('Error fetching centre details:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getPlaceofCentreDetails = async (req, res) => {
  try {
    const centres = await prisma.centre_dtl.findMany({
      select: {
        centre_place: true,
      }
    });

    if (!centres.length) {
      return res.status(200).json({ message: 'No centre details found', data: [] });
    }

    // Return only centre place codes
    return res.status(200).json({ message: 'Fetched place of centre codes successfully', data: centres });
  } catch (error) {
    console.error('Error fetching place of centre codes:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};






// export const getCentreDetails = async (req, res) => {
//     try {
//         const centres = await prisma.$queryRaw`
//             SELECT 
//                 cd.centre_code,
//                 cd.province_code,
//                 cd.division_type_code,
//                 cd.division_code,
//                 cd.apostolate_code,
//                 cd.centre_type_code,
//                 cd.community_house_code,
//                 cd.centre_name,
//                 cd.centre_place,
//                 cd.address1,
//                 cd.address2,
//                 cd.address3,
//                 cd.city_dist,
//                 cd.pin_zipcode,
//                 cd.country_code,
//                 cd.state_code,
//                 cd.diocese_code,
//                 cd.phone1_isd,
//                 cd.phone1_no,
//                 cd.phone2_isd,
//                 cd.phone2_no,
//                 cd.phone3_isd,
//                 cd.phone3_no,
//                 cd.mobile1_isd,
//                 cd.mobile1_no,
//                 cd.mobile2_isd,
//                 cd.mobile2_no,
//                 cd.mobile3_isd,
//                 cd.mobile3_no,
//                 cd.watsup_isd,
//                 cd.watsup_no,
//                 cd.fax_isd,
//                 cd.fax_no,
//                 cd.office_mailid1,
//                 cd.office_mailid2,
//                 cd.office_mailid3,
//                 cd.website1,
//                 cd.website2,
//                 cd.website3,
//                 cd.language_code,
//                 cd.concurrency_val,
//                 cd.created_by,
//                 cd.created_date,
//                 cd.updated_by,
//                 cd.updated_date,
//                 pm.province_name,
//                 qc.quickcode_name as division_type_name,
//                 am.apostolate_name, -- Adjusted table name for apostolate
//                 ctm.centre_type_name -- Adjusted table name for centre type
//             FROM 
//                 centre_dtl cd
//             JOIN 
//                 province_mst pm ON cd.province_code = pm.province_code
//             JOIN 
//                 quickcode_mst qc ON cd.division_type_code = qc.quick_code
//             LEFT JOIN 
//                 apostolates_mst am ON cd.apostolate_code = am.apostolate_code
//             LEFT JOIN 
//                 apostolates_mst ctm ON cd.centre_type_code = ctm.centre_type_code
//             WHERE 
//                 qc.quick_code_type = 'divtyp'
//         `;

//         // Convert BigInt fields to strings
//         const centresWithBigIntStrings = centres.map(centre => ({
//             ...centre,
//             phone1_no: centre.phone1_no.toString(),
//             phone2_no: centre.phone2_no ? centre.phone2_no.toString() : null,
//             phone3_no: centre.phone3_no ? centre.phone3_no.toString() : null,
//             mobile1_no: centre.mobile1_no ? centre.mobile1_no.toString() : null,
//             mobile2_no: centre.mobile2_no ? centre.mobile2_no.toString() : null,
//             mobile3_no: centre.mobile3_no ? centre.mobile3_no.toString() : null,
//             watsup_no: centre.watsup_no ? centre.watsup_no.toString() : null,
//             fax_no: centre.fax_no ? centre.fax_no.toString() : null,
//         }));

//         res.json({ data: centresWithBigIntStrings });
//     } catch (error) {
//         console.error('Error fetching centres:', error.message);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// };



export const getCentreDetailsByCode = async (req, res) => {
  const { centre_code } = req.params;

  try {
    const centre = await prisma.$queryRaw`
            SELECT 
                cd.centre_code,
                cd.province_code,
                cd.division_type_code,
                cd.division_code,
                cd.apostolate_code,
                cd.centre_type_code,
                cd.community_house_code,
                cd.centre_name,
                cd.centre_place,
                cd.address1,
                cd.address2,
                cd.address3,
                cd.city_dist,
                cd.pin_zipcode,
                cd.country_code,
                cd.state_code,
                cd.diocese_code,
                cd.phone1_isd,
                cd.phone1_no,
                cd.phone2_isd,
                cd.phone2_no,
                cd.phone3_isd,
                cd.phone3_no,
                cd.mobile1_isd,
                cd.mobile1_no,
                cd.mobile2_isd,
                cd.mobile2_no,
                cd.mobile3_isd,
                cd.mobile3_no,
                cd.watsup_isd,
                cd.watsup_no,
                cd.fax_isd,
                cd.fax_no,
                cd.office_mailid1,
                cd.office_mailid2,
                cd.office_mailid3,
                cd.website1,
                cd.website2,
                cd.website3,
                cd.language_code,
                cd.concurrency_val,
                cd.created_by,
                cd.created_date,
                cd.updated_by,
                cd.updated_date,
                pm.province_name,
                qc.quickcode_name as division_type_name
            FROM 
                centre_dtl cd
            JOIN 
                province_mst pm ON cd.province_code = pm.province_code
            JOIN 
                quickcode_mst qc ON cd.division_type_code = qc.quick_code
            WHERE 
                qc.quick_code_type = 'divtyp'
                AND cd.centre_code = ${centre_code}
        `;

    if (!centre || centre.length === 0) {
      return res.status(404).json({ error: `No details found for centre_code ${centre_code}` });
    }

    // Convert BigInt fields to strings
    const centreWithBigIntStrings = {
      ...centre[0],
      phone1_no: centre[0].phone1_no.toString(),
      phone2_no: centre[0].phone2_no ? centre[0].phone2_no.toString() : null,
      phone3_no: centre[0].phone3_no ? centre[0].phone3_no.toString() : null,
      mobile1_no: centre[0].mobile1_no ? centre[0].mobile1_no.toString() : null,
      mobile2_no: centre[0].mobile2_no ? centre[0].mobile2_no.toString() : null,
      mobile3_no: centre[0].mobile3_no ? centre[0].mobile3_no.toString() : null,
      watsup_no: centre[0].watsup_no ? centre[0].watsup_no.toString() : null,
      fax_no: centre[0].fax_no ? centre[0].fax_no.toString() : null,
    };

    res.json({ data: centreWithBigIntStrings });
  } catch (error) {
    console.error(`Error fetching centre details for centre_code ${centre_code}:`, error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



export const updateCentreDetails = async (req, res) => {
  const {
    province_code,
    division_type_code,
    division_code,
    apostolate_code,
    centre_type_code,
    community_house_code,
    centre_name,
    centre_place,
    address1,
    address2,
    address3,
    city_dist,
    pin_zipcode,
    country_code,
    state_code,
    diocese_code,
    phone1_isd,
    phone1_no,
    phone2_isd,
    phone2_no,
    phone3_isd,
    phone3_no,
    watsup_isd,
    watsup_no,
    office_mailid1,
    office_mailid2,
    office_mailid3,
    website1,
    website2,
    website3,
    language_code = 'en',  // Default value
    concurrency_val = 1,   // Default value
    updated_by   // Default value
  } = req.body;

  const { centre_code } = req.params;  // Extract centre_code from URL params
  const updated_date = new Date();     // Automatically generate the current date

  try {

    const authHeader = req.headers.authorization;

    // Validate the token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
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
    const UpdatedBy = decoded.role_name || decoded.username || "Unknown";

    // Fetch province_code based on province_name
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the given name" });
    }

    const province_code = province.province_code;
    // Fetch all records from centre_dtl


    console.log('Updating data for centre_code:', centre_code);

    const missingFields = [];

    if (!division_type_code) missingFields.push('division_type_code');
    if (!division_code) missingFields.push('division_code');
    if (!apostolate_code) missingFields.push('apostolate_code');
    if (!centre_type_code) missingFields.push('centre_type_code');
    if(! diocese_code) missingFields.push('diocese_code');
    if (!community_house_code) missingFields.push('community_house_code');
    if (!centre_name) missingFields.push('centre_name');
    if (!centre_place) missingFields.push('centre_place');
    if (!address1) missingFields.push("Address 1");
    if (!address2) missingFields.push("Place");
    if (!pin_zipcode) missingFields.push("Pin/Zip Code");
    if (!city_dist) missingFields.push("City/District");
    if (!country_code) missingFields.push("Country Code");
    if (!state_code) missingFields.push("State Code");
    if(!phone1_no)missingFields.push("Phone Number1");
    if(!phone1_isd)missingFields.push("Phone isd 1");
    if(!office_mailid1)missingFields.push("Office Mailid1")
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
        fields: missingFields, // List of missing fields for further use
      });
    }


    const centres = await prisma.centre_dtl.findFirst({
      where: { centre_code, province_code }
    });

    if (!centres) {
      console.error(`Centre with code ${centre_code} not found`);
      return res.status(404).json({ error: `Centre with code ${centre_code} not found` });
    }



    // Check if division_type_code exists in quickcode_mst
    const divisionType = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'divtyp',
          quick_code: division_type_code
        }
      }
    });
    if (!divisionType) {
      return res.status(404).json({ error: `Division type code ${division_type_code} not found` });
    }

    // Check if division_code exists in division_setup_mst
    const division = await prisma.division_setup_mst.findFirst({
      where: { division_code }
    });
    if (!division) {
      return res.status(404).json({ error: `Division code ${division_code} not found` });
    }

    // Check if apostolate_code exists in apostolate_mst
    const apostolate = await prisma.apostolates_mst.findFirst({
      where: { apostolate_code }
    });
    if (!apostolate) {
      return res.status(404).json({ error: `Apostolate code ${apostolate_code} not found` });
    }

    // Check if centre_type_code exists in quickcode_mst
    const centreType = await prisma.quickcode_mst.findUnique({
      where: {
        quick_code_type_quick_code: {
          quick_code_type: 'ctrtyp',
          quick_code: centre_type_code
        }
      }
    });
    if (!centreType) {
      return res.status(404).json({ error: `Centre type code ${centre_type_code} not found` });
    }

    // Check if community_house_code exists in community_house_dtl
    const communityHouse = await prisma.community_house_dtl.findFirst({
      where: { community_house_code }
    });
    if (!communityHouse) {
      return res.status(404).json({ error: `Community house code ${community_house_code} not found` });
    }

    // Update the centre_dtl entry
    const updatedCentre = await prisma.centre_dtl.update({
      where: {
        centre_code_province_code_division_type_code_division_code: {
          centre_code,
          province_code: centres.province_code,
          division_type_code: centres.division_type_code,
          division_code: centres.division_code
        }
      },
      data: {
        province_code,
        division_type_code,
        division_code,
        apostolate_code,
        centre_type_code,
        community_house_code,
        centre_name,
        centre_place,
        address1,
        address2:address2 ? address2.trim().toUpperCase() : null,
        address3,
        city_dist,
        pin_zipcode,
        country_code,
        state_code,
        diocese_code,
        phone1_isd,
        phone1_no,
        phone2_isd,
        phone2_no,
        phone3_isd,
        phone3_no,
        watsup_isd,
        watsup_no,
        office_mailid1,
        office_mailid2,
        office_mailid3,
        website1,
        website2,
        website3,
        language_code,
        concurrency_val,
        updated_by: res.locals.user?.user_id || UpdatedBy,
        updated_date
      }
    });

    // Convert BigInt fields to string before returning
    const updatedCentreToReturn = {
      ...updatedCentre,
      phone1_no: updatedCentre.phone1_no.toString(),
      phone2_no: updatedCentre.phone2_no ? updatedCentre.phone2_no.toString() : null,
      phone3_no: updatedCentre.phone3_no ? updatedCentre.phone3_no.toString() : null,
      watsup_no: updatedCentre.watsup_no ? updatedCentre.watsup_no.toString() : null,
    };

    console.log('Data updated successfully:', updatedCentreToReturn);
    return res.status(200).json({ message: 'Data updated successfully', data: updatedCentreToReturn });
  } catch (error) {
    console.error('Error updating data:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};


export const deleteCentreDetails = async (req, res) => {
  const { centre_code } = req.params;

  try {
    console.log('Received data for deletion:', req.params);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;

    // Verify the token
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

    // Extract province_name and created_by from the decoded token
    const provinceName = decoded.province_name;
    const UpdatedBy = decoded.role_name || decoded.username || "Unknown";

    // Fetch province_code based on province_name from the token
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the given name" });
    }

    const province_code = province.province_code;

    // First, find the existing centre details using only the centre_code
    const existingCentre = await prisma.centre_dtl.findFirst({
      where: {
        centre_code,
        province_code,
      },
      select: {
        centre_code: true,
        province_code: true,
        division_type_code: true,
        division_code: true,
      },
    });

    console.log('Existing Centre:', existingCentre);

    if (!existingCentre) {
      console.error(`Centre with code ${centre_code} not found`);
      return res.status(404).json({ error: `Centre with code ${centre_code} not found` });
    }

    // Now delete the centre detail using all composite key fields
    const result = await prisma.centre_dtl.delete({
      where: {
        centre_code_province_code_division_type_code_division_code: {
          centre_code: existingCentre.centre_code,
          province_code: existingCentre.province_code,
          division_type_code: existingCentre.division_type_code,
          division_code: existingCentre.division_code,
        },
      },
    });

    // Convert BigInt values to strings in the result
    const serializedResult = JSON.parse(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    console.log('Data deleted successfully:', serializedResult);
    return res.status(200).json({ message: 'Data deleted successfully', data: serializedResult });
  } catch (error) {
    console.error('Error deleting data:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getCentresByPlace = async (req, res) => {
  // Extracting the 'centre_place' from the request parameters
  const { centre_place } = req.params;

  try {
    // Querying the database to find all centre details by 'centre_place'
    const centreDetails = await prisma.centre_dtl.findMany({
      where: {
        centre_place: centre_place,
      },
      select: {
        centre_name: true,
        centre_code: true
      },
    });

    // Handling case when no centres are found
    if (centreDetails.length === 0) {
      return res.status(404).json({ message: 'No centres found for the given place' });
    }

    centreDetails.sort((a, b) => a.centre_name.localeCompare(b.centre_name));

    // Successfully returning all centre names and centre codes
    return res.status(200).json({
      message: 'Centre details fetched successfully',
      data: centreDetails,
    });
  } catch (error) {
    console.error('Error fetching centre details:', error);
    return res.status(500).json({
      message: 'Failed to retrieve centre details',
      error: error.message,
    });
  }
};

// Function to save center details from Excel
export const saveCentreDetailsByExcel = async (req, res) => {
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
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired" });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token" });
      }
      return res.status(500).json({ error: "Failed to verify token" });
    }

    const { provinceCodes } = await resolveDataScope(req, prisma);
    const context = {
      provinceCodes,
      provinceCode: decoded.province_code,
      provinceName: decoded.province_name,
      createdBy: res.locals.user?.user_id || decoded.role_name || decoded.username || 'Unknown',
    };
    // Read the file from the file system
    let workbook;
    try {
      const filePath = req.file.path;
      const fileBuffer = fs.readFileSync(filePath);
      workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    } catch (parseError) {
      console.error('Error parsing Excel file:', parseError);
      return res.status(400).json({ error: 'Failed to parse Excel file. Please check the file format.' });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ error: 'The uploaded Excel file does not contain any sheets.' });
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

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

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'No data found in the Excel file.' });
    }

    const successRecords = [];
    const failedRecords = [];

    for (const [index, row] of rows.entries()) {
      try {
        await saveCentreExcelRow(prisma, row, context);
        successRecords.push(row);
      } catch (error) {
        failedRecords.push({
          details: row,
          rowNumber: Number.isInteger(row.__rowNum__) ? row.__rowNum__ + 1 : index + 2,
          error: error.message,
        });
      }
    }
    const summary = { total: rows.length, saved: successRecords.length, failed: failedRecords.length };
    return res.status(summary.failed ? (summary.saved ? 207 : 400) : 200).json({
      message: summary.failed
        ? (summary.saved ? 'Some centre details uploaded successfully. Some failed.' : 'All centre details failed to upload.')
        : 'All centre details uploaded successfully.',
      savedRecords: successRecords,
      failedRecords,
      summary,
    });
  } catch (error) {
    console.error('Error uploading centre details:', error.message);
    return sendScopeError(res, error, 'An error occurred while processing the file.');
  }
};

export const getcenterdetails = async (req, res, next) => {
  const { centre_code } = req.params;

  try {
    const globalRead = !!estatusRecordWhere(req);
    // Fetch the centre details using centre_code
    const centreData = await prisma.centre_dtl.findMany({
      where: estatusRecordWhere(req) || await recordWhere(req, prisma, { centre_code }),
    });

    if (centreData.length > 1) return res.status(400).json({ message: 'Specify the complete centre record key.' });
    if (centreData.length === 0) {
      return res.status(404).json({ message: 'No data found for the provided centre_code' });
    }

    // Convert BigInt fields to string and fetch additional data concurrently
    const serializedData = await Promise.all(
      centreData.map(async (centre) => {
        const convertedCentre = convertBigIntToString(centre);

        // Fetch additional data in parallel
        const [
          province,
          divisionTypeQuickcode,
          division,
          quickcode,
          quickcodeCentreType,
          quickcodeDiocese,
          communityHouse,
          country,
          state,
        ] = await Promise.all([
          prisma.province_mst.findFirst({
            where: { province_code: centre.province_code },
            select: { province_name: true },
          }),
          prisma.quickcode_mst.findFirst({
            where: { quick_code: centre.division_type_code, ...(globalRead ? { quick_code_type: 'divtyp' } : {}) },
            select: { quickcode_name: true },
          }),
          prisma.division_setup_mst.findFirst({
            where: {
              province_code: centre.province_code,
              division_type_code: centre.division_type_code,
              division_code: centre.division_code,
            },
            select: { division_name: true },
          }),
          globalRead ? (centre.apostolate_code ? prisma.apostolates_mst.findFirst({
            where: { apostolate_code: centre.apostolate_code, centre_type_code: centre.centre_type_code || undefined, province_code: centre.province_code },
            select: { apostolate_name: true },
          }).then((row) => row ? { quickcode_name: row.apostolate_name } : null) : null) : prisma.quickcode_mst.findFirst({
            where: { quick_code: centre.apostolate_code },
            select: { quickcode_name: true },
          }),
          globalRead && !centre.centre_type_code ? null : prisma.quickcode_mst.findFirst({
            where: { quick_code: centre.centre_type_code, ...(globalRead ? { quick_code_type: 'ctrtyp' } : {}) },
            select: { quickcode_name: true },
          }),
          prisma.quickcode_mst.findFirst({
            where: { quick_code: centre.diocese_code, ...(globalRead ? { quick_code_type: 'diocse' } : {}) },
            select: { quickcode_name: true },
          }),
          globalRead && !centre.community_house_code ? null : prisma.community_house_dtl.findFirst({
            where: { community_house_code: centre.community_house_code, ...(globalRead ? { province_code: centre.province_code, division_type_code: centre.division_type_code, division_code: centre.division_code } : {}) },
            select: { community_house_name: true },
          }),
          prisma.country_mst.findFirst({
            where: { country_code: centre.country_code, ...(globalRead ? { province_code: centre.province_code } : {}) },
            select: { country_name: true },
          }),
          prisma.state_mst.findFirst({
            where: { state_code: centre.state_code, ...(globalRead ? { country_code: centre.country_code, province_code: centre.province_code } : {}) },
            select: { state_name: true },
          }),
        ]);

        const address = [centre.address1, centre.address2, centre.address3].filter(Boolean).join(', ');

        return {
          ...convertedCentre,
          province_name: province?.province_name || '',
          division_type_name: divisionTypeQuickcode?.quickcode_name || '',
          division_name: division?.division_name || '',
          Apostolate_name: quickcode?.quickcode_name || '',
          Centre_name: quickcodeCentreType?.quickcode_name || '',
          diocese_name: quickcodeDiocese?.quickcode_name || '',
          Community_house_name: communityHouse?.community_house_name || '',
          Country: country?.country_name || '',
          Address: address,
          State: state?.state_name || '',
        };
      })
    );

    res.json(serializedData);
  } catch (error) {
    console.log('error');

    next(error); // Pass the error to the error handler
  }
};

// Helper function to convert BigInt fields to string
const convertBigIntToString = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, typeof value === 'bigint' ? value.toString() : value])
  );
};




// export const getCenterReportdata = async (req, res) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "Access token is missing or invalid" });
//     }

//     const token = authHeader.split(" ")[1];
//     let decoded;

//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (error) {
//       const errorMessage = error.name === "TokenExpiredError" ? "Token has expired" : "Invalid token";
//       return res.status(401).json({ error: errorMessage });
//     }

//     const provinceName = decoded.province_name;

//     const province = await prisma.province_mst.findFirst({
//       where: { province_name: provinceName },
//       select: { province_code: true },
//     });

//     if (!province) {
//       return res.status(404).json({ error: "Province not found for the given name" });
//     }

//     const province_code = province.province_code;

//     const centres = await prisma.centre_dtl.findMany({
//       where: { province_code },
//     });

//     if (!centres.length) {
//       return res.status(200).json({ message: "No centre details found", data: [] });
//     }

//     console.log("Centre Details Debug:", centres);

//     const centresWithDetails = await Promise.all(
//       centres.map(async (centre) => {
//         const [diocese] = await prisma.$queryRaw`
//           SELECT quickcode_name 
//           FROM quickcode_mst 
//           WHERE quick_code = ${centre.diocese_code}`;

//         // Fetch all confrere codes associated with the centre_code
//         const appointDetails = await prisma.appoint_transfer_dtl.findMany({
//           where: { centre_code: centre.centre_code },
//           select: { confrer_code: true },
//         });

//         const confrereCodes = appointDetails.map((detail) => detail.confrer_code);

//         // Fetch confrere details (first_name, middle_name, last_name) for these confrere codes
//         const confreres = await prisma.confreres_dtl.findMany({
//           where: { confrer_code: { in: confrereCodes } },
//           select: {
//             first_name: true,
//             middle_name: true,
//             last_name: true,
//           },
//         });

//         // Combine names into full names
//         const confrereNames = confreres
//           .map((c) =>
//             [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ")
//           )
//           .join(", ");

//         // Construct address
//         const addressParts = [
//           centre.address1,
//           centre.address2,
//           centre.city_dist,
//           centre.state_code,
//           centre.country_code,
//         ];
//         const formattedAddress = addressParts.filter(Boolean).join(", ");

//         return {
//           diocese_name: diocese?.quickcode_name || null,
//           address1: centre.address1 || null,
//           address2: centre.address2 || null,
//           address3: centre.city_dist || null,
//           address: formattedAddress || null,
//           confrere_name: confrereNames || null,
//           contact_details: {
//             phone1_no: centre.phone1_no ? centre.phone1_no.toString() : null,
//             phone2_no: centre.phone2_no ? centre.phone2_no.toString() : null,
//             phone3_no: centre.phone3_no ? centre.phone3_no.toString() : null,
//             mobile1_no: centre.mobile1_no ? centre.mobile1_no.toString() : null,
//             mobile2_no: centre.mobile2_no ? centre.mobile2_no.toString() : null,
//             mobile3_no: centre.mobile3_no ? centre.mobile3_no.toString() : null,
//             watsup_no: centre.watsup_no ? centre.watsup_no.toString() : null,
//             fax_no: centre.fax_no ? centre.fax_no.toString() : null,
//           },
//         };
//       })
//     );

//     return res.status(200).json({
//       message: "Fetched selected centre details successfully",
//       data: centresWithDetails,
//     });
//   } catch (error) {
//     console.error("Error fetching centre details:", error.message);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };





// export const getCenterReportdata = async (req, res) => {
//   try {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({ error: "Access token is missing or invalid" });
//     }

//     const token = authHeader.split(" ")[1];
//     let decoded;

//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (error) {
//       const errorMessage = error.name === "TokenExpiredError" ? "Token has expired" : "Invalid token";
//       return res.status(401).json({ error: errorMessage });
//     }

//     const provinceName = decoded.province_name;

//     const province = await prisma.province_mst.findFirst({
//       where: { province_name: provinceName },
//       select: { province_code: true },
//     });

//     if (!province) {
//       return res.status(404).json({ error: "Province not found for the given name" });
//     }

//     const province_code = province.province_code;

//     const centres = await prisma.centre_dtl.findMany({
//       where: { province_code },
//     });

//     if (!centres.length) {
//       return res.status(200).json({ message: "No centre details found", data: [] });
//     }

//     const response = [];

//     for (const centre of centres) {
//       // Fetch Diocese name
//       const diocese = await prisma.quickcode_mst.findFirst({
//         where: { quick_code: centre.diocese_code },
//         select: { quickcode_name: true },
//       });

//       // Fetch Place of Centre and Community House
//       const placeOfCentre = centre.centre_place || null; // Adjust this field based on your database structure
//       let communityHouseName = null;
//       if (centre.community_house_code) {
//         const communityHouse = await prisma.community_house_dtl.findFirst({
//           where: { community_house_code: centre.community_house_code },
//           select: { community_house_name: true },
//         });
//         communityHouseName = communityHouse?.community_house_name || null;
//       }


      
//       // Fetch all confrere codes associated with the centre_code
//       const appointDetails = await prisma.appoint_transfer_dtl.findMany({
//         where: { centre_code: centre.centre_code },
//         select: { confrer_code: true },
//       });

//       const confrereCodes = appointDetails.map((detail) => detail.confrer_code);

//       // Fetch confrere details
//       const confreres = await prisma.confreres_dtl.findMany({
//         where: { confrer_code: { in: confrereCodes } },
//         select: {
//           first_name: true,
//           middle_name: true,
//           last_name: true,
//           personal1_contact_no: true,
//         },
//       });

//       const confrereDetails = confreres.map((c) => ({
//         name: [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" "),
//         contact: c.personal1_contact_no ? c.personal1_contact_no.toString() : null, // Convert BigInt to string
//       }));

//       // Construct address
//       const addressParts = [
//         centre.address1,
//         centre.address2,
//         centre.city_dist,
//         centre.state_code,
//         centre.country_code,
//       ];
//       const formattedAddress = addressParts.filter(Boolean).join(", ");

//       // Centre contact details
//       const centreContactDetails = {
//         phone1_no: centre.phone1_no ? centre.phone1_no.toString() : null,
//         phone2_no: centre.phone2_no ? centre.phone2_no.toString() : null,
//         phone3_no: centre.phone3_no ? centre.phone3_no.toString() : null,
//         mobile1_no: centre.mobile1_no ? centre.mobile1_no.toString() : null,
//         mobile2_no: centre.mobile2_no ? centre.mobile2_no.toString() : null,
//         mobile3_no: centre.mobile3_no ? centre.mobile3_no.toString() : null,
//         watsup_no: centre.watsup_no ? centre.watsup_no.toString() : null,
//         fax_no: centre.fax_no ? centre.fax_no.toString() : null,
//       };

//       // Push formatted data to response
//       response.push({
//         diocese_name: diocese?.quickcode_name || null,

//         place_of_centre: placeOfCentre,

//         community_house: communityHouseName,

//         centre_address: formattedAddress,

//         details: {
//           centreAddress: {
//             centre_address: formattedAddress,
//           },

//           confreres: confrereDetails.map((confrere) => ({
//             name: confrere.name,
//             address: formattedAddress,
//           })),

//           centreContactDetails: {
//             ...centreContactDetails,
//             centre_address: formattedAddress,
//           },
          
//           confrereContactDetails: confrereDetails.map((confrere) => ({
//             name: confrere.name,
//             contact: confrere.contact,
//             address: formattedAddress,
//             centre_contact: centreContactDetails,
//           })),
//         },
//       });
//     }

//     // Serialize response safely with BigInt handling
//     const safeResponse = JSON.stringify(response, (key, value) =>
//       typeof value === "bigint" ? value.toString() : value
//     );

//     res.status(200).send(safeResponse); // Use .send() to directly send the serialized response
//   } catch (error) {
//     console.error("Error fetching centre details:", error.message);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };



export const getAllCentreDetailsForExport = async (req, res) => {
  try {
    const { provinceCodes } = await resolveDataScope(req, prisma, req.query.province_code || null);

    // Fetch all center details filtered by province_code
    const centres = await prisma.centre_dtl.findMany({
      where: provinceScopeWhere(provinceCodes),
    });

    // Fetch related details for each center
    const centresWithDetails = await Promise.all(
      centres.map(async (centre) => {
        const [province] = await prisma.$queryRaw`
          SELECT province_name 
          FROM province_mst 
          WHERE province_code = ${centre.province_code}`;

        const [division] = await prisma.$queryRaw`
          SELECT division_name 
          FROM division_setup_mst 
          WHERE province_code = ${centre.province_code} 
          AND division_type_code = ${centre.division_type_code} 
          AND division_code = ${centre.division_code}`;

        const [apostolate] = await prisma.$queryRaw`
          SELECT apostolate_name 
          FROM apostolates_mst 
          WHERE apostolate_code = ${centre.apostolate_code}`;

        const [centreType] = await prisma.$queryRaw`
          SELECT quickcode_name 
          FROM quickcode_mst 
          WHERE quick_code_type = 'ctrtyp' 
          AND quick_code = ${centre.centre_type_code}`;

        const [communityHouse] = await prisma.$queryRaw`
          SELECT community_house_name 
          FROM community_house_dtl 
          WHERE community_house_code = ${centre.community_house_code}`;

        const [country] = await prisma.$queryRaw`
          SELECT country_name 
          FROM country_mst 
          WHERE country_code = ${centre.country_code}`;

        const [state] = await prisma.$queryRaw`
          SELECT state_name 
          FROM state_mst 
          WHERE state_code = ${centre.state_code}`;

        const [diocese] = await prisma.$queryRaw`
          SELECT quickcode_name 
          FROM quickcode_mst 
          WHERE quick_code = ${centre.diocese_code}`;

        // Return the complete center details
        return {
          ...centre,
          province_name: province?.province_name || null,
          division_name: division?.division_name || null,
          apostolate_name: apostolate?.apostolate_name || null,
          centre_type_name: centreType?.quickcode_name || null,
          community_house_name: communityHouse?.community_house_name || null,
          country_name: country?.country_name || null,
          state_name: state?.state_name || null,
          diocese_name: diocese?.quickcode_name || null,
          phone1_no: centre.phone1_no ? centre.phone1_no.toString() : null,
          phone2_no: centre.phone2_no ? centre.phone2_no.toString() : null,
          phone3_no: centre.phone3_no ? centre.phone3_no.toString() : null,
          mobile1_no: centre.mobile1_no ? centre.mobile1_no.toString() : null,
          mobile2_no: centre.mobile2_no ? centre.mobile2_no.toString() : null,
          mobile3_no: centre.mobile3_no ? centre.mobile3_no.toString() : null,
          watsup_no: centre.watsup_no ? centre.watsup_no.toString() : null,
          fax_no: centre.fax_no ? centre.fax_no.toString() : null,
        };
      })
    );

    // Return the transformed data
    res.status(200).json(centresWithDetails);
  } catch (error) {
    console.error("Error fetching center details:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




