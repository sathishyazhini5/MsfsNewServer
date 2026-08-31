import { PrismaClient } from '@prisma/client';
import { JWT_SECRET } from "../../config/index.js";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { provinceScopeWhere, resolveDataScope, sendScopeError } from '../../utils/dataScope.js';

const prisma = new PrismaClient();


const generateNextDepartureCode = async () => {
  const lastDeparture = await prisma.departures_dtl.findFirst({
    orderBy: {
      departure_code: 'desc', // Order by departure_code in descending order
    },
    select: {
      departure_code: true, // Only select the departure_code field
    },
  });

  let nextDepartureCode = 1;
  if (lastDeparture) {
    const lastDepartureCode = lastDeparture.departure_code;
    console.log('Last Departure Code:', lastDepartureCode);

    // Remove the 'DEP' prefix and parse the numeric part
    const lastDepartureCodeNumeric = parseInt(lastDepartureCode.replace('DEP', ''), 10);
    console.log('Numeric part of Last Departure Code:', lastDepartureCodeNumeric);

    // Increment the numeric part
    nextDepartureCode = lastDepartureCodeNumeric + 1;
    console.log('Next Departure Code Numeric:', nextDepartureCode);
  }

  // Return the next code with 'DEP' prefix and padded with leading zeros
  return `DEP${String(nextDepartureCode).padStart(3, '0')}`;
};

const generateNextObituaryCode = async () => {
  const lastRecord = await prisma.obituary_dtl.findFirst({
    orderBy: {
      created_date: 'desc',  // Or any other valid field for sorting
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


const fetchDepartureTypeCode = async (departure_type_name) => {
  const quickCode = await prisma.quickcode_mst.findFirst({
    where: {
      quickcode_name: departure_type_name,
      quick_code_type: 'deptyp',
    },
  });

  if (!quickCode) {
    throw new Error(`Departure type name ${departure_type_name} not found for quick_code_type "deptyp"`);
  }

  return quickCode.quick_code;
};


const checkMemberTypeCode = async (member_type_name) => {
  const quickCode = await prisma.quickcode_mst.findFirst({
    where: {
      quickcode_name: member_type_name,
      quick_code_type: 'memtyp',
    },
  });

  if (!quickCode) {
    throw new Error(`Member type name ${member_type_name} not found for quick_code_type "memtyp"`);
  }

  return quickCode.quick_code;
};

const maxLength = (str, len) => (str && str.length > len ? str.substring(0, len) : str);




export const saveDepartureDetails = async (req, res) => {
  try {
    const {
      confrer_scholastic_code,
      member_type,
      departure_type,
      departure_date,
      remarks,
      updated_by,
      updated_date,
      date_of_death,
      disease_name,
      place_of_death,
      cause_of_death,
      country_of_death,
      country_of_origin,
    } = req.body;

    console.log(req.body);

    // ✅ Check Authorization
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

    // ✅ Fetch `province_code` using `province_name` from token
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceNameFromToken },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: `Province '${provinceNameFromToken}' not found.` });
    }

    const province_code = province.province_code;

    // Validate Member Type Code from quickcode_mst (memtyp)
    const memberTypeRecord = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type: { equals: 'memtyp', mode: 'insensitive' },
        quick_code: { equals: member_type, mode: 'insensitive' },
      },
    });

    if (!memberTypeRecord) {
      console.error(`Member type name ${member_type} not found for quick_code_type "memtyp"`);
      return res.status(404).json({ error: `Member type name ${member_type} not found for quick_code_type "memtyp"` });
    }

    // Validate Departure Type Code from quickcode_mst (deptyp)
    const departureTypeRecord = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type: { equals: 'deptyp', mode: 'insensitive' },
        quickcode_name: { equals: departure_type, mode: 'insensitive' },
      },
    });

    if (!departureTypeRecord) {
      console.error(`Departure type ${departure_type} not found for quick_code_type "deptyp"`);
      return res.status(404).json({ error: `Departure type ${departure_type} not found for quick_code_type "deptyp"` });
    }


    // ✅ Check if `confrer_scholastic_code` exists in `confreres_dtl` or `scholastics_dtl`
    const confrerorscholastic = await prisma.confreres_dtl.findFirst({
      where: { confrer_code: confrer_scholastic_code },
    }) || await prisma.scholastics_dtl.findFirst({
      where: { scholastic_code: confrer_scholastic_code },
    });

    if (!confrerorscholastic) {
      return res.status(404).json({ error: `Confrer or Scholastic code ${confrer_scholastic_code} not found` });
    }

    // ✅ Check if a departure record already exists
    const existingDeparture = await prisma.departures_dtl.findFirst({
      where: {
        province_code: province_code,
        confrer_scholastic_code: confrer_scholastic_code,
      },
    });

    if (existingDeparture) {
      return res.status(400).json({
        error: `A departure record already exists for confrer_scholastic_code  in province .`,
      });
    }

    const existingObituary = await prisma.obituary_dtl.findFirst({
      where: {
        province_code: province_code,
        confrer_scholastic_code: confrer_scholastic_code,
      },
    });

    if (existingObituary && departure_type.trim().toLowerCase() === "deceased") {
      return res.status(400).json({
        error: `An obituary record already exists for confrer_scholastic_code  in province .`,
      });
    }

    // ✅ Prisma Transaction: Delete related records and insert departure details
    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Mark `confreres_dtl`, `scholastics_dtl`, `appoint_transfer_dtl` as inactive
      await tx.confreres_dtl.updateMany({
        where: { confrer_code: confrer_scholastic_code },
        data: { is_active: false },
      });

      await tx.scholastics_dtl.updateMany({
        where: { scholastic_code: confrer_scholastic_code },
        data: { is_active: false },
      });

      await tx.appoint_transfer_dtl.updateMany({
        where: { confrer_code: confrer_scholastic_code },
        data: { is_active: false },
      });

      // 4️⃣ Generate new `departure_code`
      const newDepartureCode = await generateNextDepartureCode();

      // 5️⃣ Prepare data for insertion
      const departureData = {
        departure_code: maxLength(newDepartureCode, 10),
        province_code: maxLength(province_code, 10),
        confrer_scholastic_code: maxLength(confrer_scholastic_code || '', 10),
        member_type_code: maxLength(memberTypeRecord.quick_code, 10),
        departure_type_code: maxLength(departureTypeRecord.quick_code, 10),
        departure_date: departure_date ? new Date(departure_date) : null,
        remarks: maxLength(remarks || '', 255),
        language_code: 'en',
        concurrency_val: 1,
        created_by: maxLength(createdBy, 50),
        created_date: new Date(),
        updated_by: updated_by ? maxLength(updated_by, 50) : null,
        updated_date: updated_date ? new Date(updated_date) : null,
      };

      // ✅ If departure type is "diseased", ensure these fields are included
      if (departure_type.trim().toLowerCase() === 'deceased') {
        departureData.place_of_death = maxLength(place_of_death || '', 100);
        departureData.cause_of_death = maxLength(cause_of_death || '', 100);
        departureData.country_of_death = maxLength(country_of_death || '', 10);
        departureData.country_of_origin = maxLength(country_of_origin || '', 10);
        departureData.date_of_death = departure_date ? new Date(departure_date) : null;
      }

      console.log("Updated Departure Data:", departureData);


      // 6️⃣ Save data in `departures_dtl`
      const departureResult = await tx.departures_dtl.create({ data: departureData });

      // ✅ If departure type is "deceased", also save in `obituary_dtl`
      let obituaryResult = null;
      if (departure_type.trim().toLowerCase() === 'deceased') {
        const newObituaryCode = await generateNextObituaryCode();
        const obituaryData = {
          obituary_code: maxLength(newObituaryCode, 10),
          province_code: maxLength(province_code, 10),
          confrer_scholastic_code: maxLength(confrer_scholastic_code || '', 10),
          member_type_code: maxLength(memberTypeRecord.quick_code, 10),
          //       departure_type_code: maxLength(departureTypeRecord.quick_code, 10),
          cause_of_death: maxLength(cause_of_death || '', 100),
          disease_name: maxLength(disease_name || '', 100),
          death_place: maxLength(place_of_death || '', 100),
          death_date: departure_date ? new Date(departure_date) : null, // Use `departure_date` as `death_date`
          death_country_code: maxLength(country_of_death || '', 10),
          orgin_country_code: maxLength(country_of_origin || '', 10),
          remarks: maxLength(remarks || '', 255),
          language_code: 'en',
          concurrency_val: 1,
          created_by: maxLength(createdBy, 50),
          created_date: new Date(),
          updated_by: updated_by ? maxLength(updated_by, 50) : null,
          updated_date: updated_date ? new Date(updated_date) : null,
        };

        // Save data in `obituary_dtl`
        obituaryResult = await tx.obituary_dtl.create({ data: obituaryData });
      }

      return { departureResult, obituaryResult };
    });

    // ✅ Send success response
    res.status(200).json({
      message: 'Departure details saved successfully. Deceased records also saved in obituary table (if applicable).',
      departure: result.departureResult,
      obituary: result.obituaryResult || null
    });

  } catch (error) {
    console.error('Error saving departure details:', error);
    res.status(500).json({ error: error.message || 'An error occurred while saving the departure details' });
  }
};



export const getAllDepartures = async (req, res) => {
  try {
    const { provinceCodes } = await resolveDataScope(req, prisma, req.query.province_code || null);


    // Fetch all records from departures_dtl
    const departures = await prisma.departures_dtl.findMany({
      where: provinceScopeWhere(provinceCodes),
    });

    // Fetch related names for each departure using raw SQL
    const departuresWithNames = await Promise.all(
      departures.map(async (departure) => {
        // Log departure_type_code to debug
        console.log('departure_type_code:', departure.departure_type_code);

        const [province] = await prisma.$queryRaw`
            SELECT province_name 
            FROM province_mst 
            WHERE province_code = ${departure.province_code}`;

        const [memberType] = await prisma.$queryRaw`
            SELECT quickcode_name 
            FROM quickcode_mst 
            WHERE quick_code_type = 'memtyp' 
            AND quick_code = ${departure.member_type_code}`;

        const [departureType] = await prisma.$queryRaw`
            SELECT quickcode_name 
            FROM quickcode_mst 
            WHERE quick_code_type = 'deptyp' 
            AND quick_code = ${departure.departure_type_code}`;

        // Fetch the name associated with the confrer_scholastic_code from either confreres_dtl or scholastics_dtl
        let name = null;
        const [confrere] = await prisma.$queryRaw`
            SELECT first_name, middle_name, last_name 
            FROM confreres_dtl 
            WHERE confrer_code = ${departure.confrer_scholastic_code}`;

        if (!confrere) {
          const [scholastic] = await prisma.$queryRaw`
              SELECT first_name, middle_name, last_name 
              FROM scholastics_dtl 
              WHERE scholastic_code = ${departure.confrer_scholastic_code}`;
          name = scholastic
            ? `${scholastic.first_name} ${scholastic.middle_name || ''} ${scholastic.last_name}`.trim()
            : null;
        } else {
          name = `${confrere.first_name} ${confrere.middle_name || ''} ${confrere.last_name}`.trim();
        }

        return {
          ...departure,
          province_name: province?.province_name || null,
          member_type_name: memberType?.quickcode_name || null,
          departure_type_name: departureType?.quickcode_name || null, // Fetching from quickcode_mst based on 'deptyp'
          name: name || departure.confrer_scholastic_code, // Return name or confrer_scholastic_code if name is not found
        };
      })
    );

    return res.status(200).json(departuresWithNames);
  } catch (error) {
    console.error('Error fetching departures:', error);
    return sendScopeError(res, error, 'An error occurred while fetching departures');
  }
};

export const getDepartureByCode = async (req, res) => {
  const { departure_code } = req.body;

  try {
    const departure = await prisma.departures_dtl.findUnique({
      where: { departure_code: departure_code },
    });

    if (!departure) {
      return res.status(404).json({ error: 'Departure not found' });
    }

    return res.status(200).json(departure);
  } catch (error) {
    console.error('Error fetching departure:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateDepartureDetails = async (req, res) => {
  try {
    const {
      departure_code,
      confrer_scholastic_code,
      member_type,
      departure_type,
      departure_date,
      remarks,
      updated_by,
      updated_date,
      disease_name,
      date_of_death,
      place_of_death,
      cause_of_death,
      country_of_death,
      country_of_origin,
    } = req.body;

    console.log(req.body);

    // Validate token and get user info
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: err.name === "TokenExpiredError" ? "Access token has expired" : "Invalid token" });
    }

    console.log("Authenticated user:", decoded);

    // Fetch the province_code for the authenticated user
    const provinceName = decoded.province_name;
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the logged-in user" });
    }

    const province_code = province.province_code;
    const updatedBy = decoded.role_name || decoded.username || "Unknown";


    // Validate if departure_code exists
    const existingDeparture = await prisma.departures_dtl.findUnique({
      where: { departure_code },
    });

    if (!existingDeparture) {
      return res.status(404).json({ error: `Departure with code ${departure_code} not found` });
    }

    // Check if departure record already exists (prevent duplicates)
    const existingDepartures = await prisma.departures_dtl.findFirst({
      where: {
        province_code: province_code,
        confrer_scholastic_code: confrer_scholastic_code,
        NOT: { departure_code: departure_code },
      },
    });

    if (existingDepartures) {
      return res.status(400).json({
        error: `A departure record already exists for confrer_scholastic_code  in province . No duplicate entries allowed.`,
      });
    }

    // Validate Member Type
    const memberTypeRecord = await prisma.quickcode_mst.findFirst({
      where: { quick_code_type: "memtyp", quick_code: member_type },
    });

    if (!memberTypeRecord) {
      return res.status(404).json({ error: `Member type ${member_type} not found.` });
    }

    // Validate Departure Type
    const departureTypeRecord = await prisma.quickcode_mst.findFirst({
      where: { quick_code_type: "deptyp", quickcode_name: departure_type },
    });

    if (!departureTypeRecord) {
      return res.status(404).json({ error: `Departure type ${departure_type} not found.` });
    }

    // Fetch disease_name from confreres_dtl based on confrer_scholastic_code
    const confrereDetails = await prisma.confreres_dtl.findFirst({
      where: { confrer_code: confrer_scholastic_code },
      select: { first_name: true, middle_name: true, last_name: true }, // ✅ Fetch names
    });

    // ✅ Join names into a full name string
    const retrievedDiseaseName = [
      confrereDetails?.first_name,
      confrereDetails?.middle_name,
      confrereDetails?.last_name
    ]
      .filter(Boolean) // ✅ Remove null or undefined values
      .join(" "); // ✅ Join with a space



    // ✅ Check if an obituary already exists for this confrer_scholastic_code
    const obituaryExists = await prisma.obituary_dtl.findFirst({
      where: { confrer_scholastic_code: confrer_scholastic_code },
    });

    const finalDateOfDeath = date_of_death ? new Date(date_of_death) : new Date(departure_date);

    // ✅ Prepare updated departure data
    const updatedData = {
      province_code,
      confrer_scholastic_code,
      member_type_code: memberTypeRecord.quick_code,
      departure_type_code: departureTypeRecord.quick_code,
      departure_date: departure_date ? new Date(departure_date) : null,
      date_of_death: departure_type.trim().toLowerCase() === "deceased" ? finalDateOfDeath : null, // ✅ Store correct death date
      remarks,
      updated_by: updatedBy,
      updated_date: updated_date ? new Date(updated_date) : new Date(),
    };

    let obituaryResult = null;

    // ✅ Fetch the actual departure type name from quickcode_mst
    const existingDepartureTypeRecord = await prisma.quickcode_mst.findFirst({
      where: { quick_code_type: "deptyp", quick_code: existingDeparture.departure_type_code },
      select: { quickcode_name: true },
    });

    const existingDepartureType = existingDepartureTypeRecord?.quickcode_name || "";

    // ✅ If changing FROM "Deceased" to another departure type → DELETE OBITUARY
    if (existingDepartureType.toLowerCase().trim() === "deceased" && departure_type.toLowerCase().trim() !== "deceased") {
      if (obituaryExists) {
        console.log(`Deleting obituary record for ${confrer_scholastic_code}`);

        await prisma.obituary_dtl.delete({
          where: {
            obituary_code_province_code_confrer_scholastic_code: {
              obituary_code: obituaryExists.obituary_code,
              province_code: province_code,
              confrer_scholastic_code: confrer_scholastic_code,
            },
          },
        });

        console.log(`Obituary record deleted successfully for ${confrer_scholastic_code}`);
      }

      // ✅ Also, remove deceased fields in `departures_dtl`
      updatedData.date_of_death = null;
      updatedData.place_of_death = null;
      updatedData.cause_of_death = null;
      updatedData.country_of_death = null;
      updatedData.country_of_origin = null;
    }



    // ✅ If setting TO "Deceased" → UPDATE or CREATE OBITUARY
    if (departure_type.trim().toLowerCase() === "deceased") {
      // updatedData.date_of_death = date_of_death ? new Date(date_of_death) : null;
      updatedData.place_of_death = place_of_death;
      updatedData.cause_of_death = cause_of_death;
      updatedData.country_of_death = country_of_death;
      updatedData.country_of_origin = country_of_origin;

      const existingObituary = await prisma.obituary_dtl.findFirst({
        where: {
          province_code: province_code,
          confrer_scholastic_code: confrer_scholastic_code,
        },
      });

      const obituaryData = {
        province_code,
        confrer_scholastic_code,
        member_type_code: memberTypeRecord.quick_code,
        cause_of_death: cause_of_death || "Unknown",
        disease_name: retrievedDiseaseName, // ✅ Use retrieved disease name
        death_place: place_of_death || "Unknown",
        death_date: finalDateOfDeath,
        death_country_code: country_of_death || "N/A",
        orgin_country_code: country_of_origin || "N/A",
        remarks: remarks || "",
        language_code: "en",
        concurrency_val: 1,
        updated_by: updatedBy,
        updated_date: new Date(),
      };

      if (existingObituary) {
        // ✅ Update existing obituary record
        obituaryResult = await prisma.obituary_dtl.update({
          where: {
            obituary_code_province_code_confrer_scholastic_code: {
              obituary_code: existingObituary.obituary_code,
              province_code: province_code,
              confrer_scholastic_code: confrer_scholastic_code,
            },
          },
          data: obituaryData,
        });
        console.log(`Obituary updated for confrer_scholastic_code: ${confrer_scholastic_code}`);
      } else {
        // ✅ Create a new obituary entry
        const newObituaryCode = await generateNextObituaryCode();
        obituaryData.obituary_code = newObituaryCode;
        obituaryData.created_by = updatedBy;
        obituaryData.created_date = new Date();

        obituaryResult = await prisma.obituary_dtl.create({ data: obituaryData });
      }
    }


    // ✅ Update the departure record
    const result = await prisma.departures_dtl.update({
      where: { departure_code },
      data: {
        ...updatedData,
        date_of_death: updatedData.date_of_death || null, // ✅ Ensure this is explicitly set
        place_of_death: updatedData.place_of_death || null,
        cause_of_death: updatedData.cause_of_death || null,
        country_of_death: updatedData.country_of_death || null,
        country_of_origin: updatedData.country_of_origin || null,
      },
    });

    // ✅ Format response
    const responseResult = {
      ...result,
      departure_date: result.departure_date ? result.departure_date.toISOString().split("T")[0] : null,
      date_of_death: result.date_of_death ? result.date_of_death.toISOString().split("T")[0] : null,
    };

    return res.status(200).json({
      message: "Departure details updated successfully",
      result: responseResult,
      obituary: obituaryResult ? { message: "Obituary updated successfully", data: obituaryResult } : null,
    });

  } catch (error) {
    console.error("Error updating departure details:", error);
    return res.status(500).json({ error: error.message || "An error occurred while updating the departure details" });
  }
};



export const deleteDepartureByCode = async (req, res) => {
  const { departure_code } = req.params;

  console.log('Departure code received for deletion:', departure_code);

  if (!departure_code) {
    console.log('Invalid departure code');
    return res.status(400).json({ error: 'Invalid departure code.' });
  }

  try {
    // ✅ Check Authorization
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

    console.log("Authenticated user:", decoded);

    // ✅ Fetch the province_code from the decoded token
    const provinceName = decoded.province_name;
    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the logged-in user" });
    }

    const province_code = province.province_code;

    // ✅ Retrieve the departure record
    const departureRecord = await prisma.departures_dtl.findUnique({
      where: { departure_code },
    });

    if (!departureRecord) {
      return res.status(404).json({ error: 'Departure not found.' });
    }

    // ✅ Fetch the departure type name
    const departureTypeRecord = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type: 'deptyp',
        quick_code: departureRecord.departure_type_code,
      },
      select: {
        quickcode_name: true,
      },
    });

    if (!departureTypeRecord) {
      console.error(`Departure type ${departureRecord.departure_type_code} not found for quick_code_type "deptyp"`);
      return res.status(404).json({ error: 'Departure type not found' });
    }

    console.log(`Departure type name: ${departureTypeRecord.quickcode_name}`);

    // ✅ Start Transaction
    await prisma.$transaction(async (tx) => {
      // ✅ If the departure type is "Deceased", delete its related obituary record
      if (departureTypeRecord.quickcode_name === 'Deceased') {
        const { province_code, confrer_scholastic_code, member_type_code } = departureRecord;

        // Delete obituary record
        const obituaryDeletion = await tx.obituary_dtl.deleteMany({
          where: {
            province_code,
            confrer_scholastic_code,
            member_type_code,
          },
        });

        if (obituaryDeletion.count === 0) {
          console.warn(
            `No matching obituary record found for province_code: ${province_code}, confrer_scholastic_code: ${confrer_scholastic_code}, member_type_code: ${member_type_code}.`
          );
        } else {
          console.log(`Deleted obituary record(s): ${obituaryDeletion.count}`);
        }
      }

      // ✅ Delete the departure record
      await tx.departures_dtl.delete({
        where: { departure_code },
      });

      // ✅ Reactivate related records in `confreres_dtl`, `scholastics_dtl`, `appoint_transfer_dtl`
      await tx.confreres_dtl.updateMany({
        where: { confrer_code: departureRecord.confrer_scholastic_code },
        data: { is_active: true },
      });

      await tx.scholastics_dtl.updateMany({
        where: { scholastic_code: departureRecord.confrer_scholastic_code },
        data: { is_active: true },
      });

      await tx.appoint_transfer_dtl.updateMany({
        where: { confrer_code: departureRecord.confrer_scholastic_code },
        data: { is_active: true },
      });

      console.log(`Reactivated records for confrer_scholastic_code: ${departureRecord.confrer_scholastic_code}`);
    });

    return res.status(200).json({
      message: 'Departure deleted and related records reactivated successfully.',
    });

  } catch (error) {
    console.error('Error deleting departure:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};



export const getDeparture = async (req, res) => {
  const { departure_code } = req.params;

  try {
    // ✅ Fetch the departure record by its code
    const departure = await prisma.departures_dtl.findUnique({
      where: { departure_code },
    });

    // ✅ Check if the departure record exists
    if (!departure) {
      return res.status(404).json({ error: 'Departure not found' });
    }

    console.log('Fetched Departure:', departure); // Debugging Log

    // ✅ Fetch the province name using `province_code`
    const province = await prisma.province_mst.findFirst({
      where: { province_code: departure.province_code },
      select: { province_name: true },
    });

    // ✅ Fetch the quickcode name using `member_type_code`
    const memberType = await prisma.quickcode_mst.findFirst({
      where: { quick_code: departure.member_type_code },
      select: { quickcode_name: true },
    });

    // ✅ Fetch the departure type name using `departure_type_code`
    const departureType = await prisma.quickcode_mst.findFirst({
      where: { quick_code: departure.departure_type_code },
      select: { quickcode_name: true },
    });

    // ✅ Fetch confrere/scholastic details (including inactive records)
    const confrerOrScholastic = await prisma.confreres_dtl.findFirst({
      where: { confrer_code: departure.confrer_scholastic_code },
      select: {
        first_name: true,
        middle_name: true,
        last_name: true,
        birth_date: true,
        baptism_date: true,
        confirmation_date: true,
        first_profession_date: true,
        final_profession_date: true,
        ordination_date: true,
        nationality_code: true,
        member_type_code: true,
        province_code: true,
        is_active: true, // ✅ Include is_active field to indicate status
        personal1_isd: true, // ✅ Include ISD code
        personal1_contact_no: true, // ✅ Include Contact Number
        personal_mailid1: true, // ✅ Include Email
      },
    }) || await prisma.scholastics_dtl.findFirst({
      where: { scholastic_code: departure.confrer_scholastic_code },
      select: {
        first_name: true,
        middle_name: true,
        last_name: true,
        birth_date: true,
        baptism_date: true,
        confirmation_date: true,
        first_profession_date: true,
        final_profession_date: true,
        ordination_date: true,
        nationality_code: true,
        member_type_code: true,
        province_code: true,
        is_active: true, // ✅ Include is_active field to indicate status
        personal1_isd: true, // ✅ Include ISD code
        personal1_contact_no: true, // ✅ Include Contact Number
        personal_mailid1: true, // ✅ Include Email
      },
    });
    const formatBigInt = (value) => (typeof value === 'bigint' ? value.toString() : value);

    // ✅ Fetch nationality name if available
    const nationality = confrerOrScholastic ? await prisma.quickcode_mst.findFirst({
      where: { quick_code: confrerOrScholastic.nationality_code },
      select: { quickcode_name: true },
    }) : null;

    const calculateYearsServed = (startDate, endDate = new Date()) => {
      if (!startDate) return 'N/A';

      const start = new Date(startDate);
      const end = new Date(endDate);

      let years = end.getFullYear() - start.getFullYear();
      let months = end.getMonth() - start.getMonth();

      if (months < 0) {
        years -= 1;
        months += 12;
      }

      return `${years} Year(s) ${months} Month(s)`;
    };

    const [currentDesignation, previousDesignations] = await Promise.all([
      prisma.appoint_transfer_dtl.findMany({
        where: { confrer_code: departure.confrer_scholastic_code, designation_end_date: null },
        select: { designation_code: true, designation_appn_date: true, centre_code: true },
      }),
      prisma.appoint_transfer_dtl.findMany({
        where: { confrer_code: departure.confrer_scholastic_code, designation_end_date: { not: null } },
        select: { designation_code: true, designation_appn_date: true, designation_end_date: true, centre_code: true },
        orderBy: { designation_end_date: 'desc' },
      }),
    ]);

    // ✅ Add Designation Details for Current Designation
    const currentDesignationDetails = await Promise.all(
      currentDesignation.map(async (designation) => {
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
          centre_name: centreDetails?.centre_name || 'N/A',
          centre_place: centreDetails?.centre_place || 'N/A',
          centre_address: fullAddress,
          total_years_served: calculateYearsServed(designation.designation_appn_date),
        };
      })
    );


    // ✅ Add Designation Details for Previous Designations
    const previousDesignationDetails = await Promise.all(
      previousDesignations.map(async (designation) => {
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
          total_years_served: calculateYearsServed(designation.designation_appn_date, designation.designation_end_date),
        };
      })
    );



    // ✅ Prepare response data
    const responseData = {
      ...departure,
      province_name: province ? province.province_name : null,
      memberType_name: memberType ? memberType.quickcode_name : null,
      departureType_name: departureType ? departureType.quickcode_name : null,
      confrerOrScholastic_name: confrerOrScholastic
        ? `${confrerOrScholastic.first_name} ${confrerOrScholastic.middle_name || ''} ${confrerOrScholastic.last_name}`.trim()
        : departure.confrer_scholastic_code, // If not found, return the code instead
      confrerOrScholastic_details: confrerOrScholastic
        ? {
          birth_date: confrerOrScholastic.birth_date,
          baptism_date: confrerOrScholastic.baptism_date,
          confirmation_date: confrerOrScholastic.confirmation_date,
          first_profession_date: confrerOrScholastic.first_profession_date,
          final_profession_date: confrerOrScholastic.final_profession_date,
          ordination_date: confrerOrScholastic.ordination_date,
          nationality: nationality ? nationality.quickcode_name : null,
          is_active: confrerOrScholastic.is_active, // ✅ Indicates if confrere is active/inactive
          isd_code: confrerOrScholastic.personal1_isd || 'N/A', // ✅ ISD Code
          contact_no: formatBigInt(confrerOrScholastic.personal1_contact_no) || 'N/A', // ✅ Contact Number
          email: confrerOrScholastic.personal_mailid1 || 'N/A', // ✅ Email
        }
        : null, // If no confrere details found, return null
      current_designation: currentDesignationDetails,
      previous_designations: previousDesignationDetails,
    };

    return res.status(200).json({
      message: 'Departure fetched successfully',
      data: responseData,
    });

  } catch (error) {
    console.error('Error fetching departure:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
