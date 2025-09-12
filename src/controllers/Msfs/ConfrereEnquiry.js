import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import fs from 'fs';

import { JWT_SECRET } from "../../config/index.js";
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";



// Function to handle filtering confreres
const formatDate = (date) => {
  if (!date) return '';
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Date(date).toLocaleDateString('en-US', options);
};

export const filterConfreres = async (req, res, next) => {
  const {
    names,
    dob,
    contactNumbers,
    whatsappNumbers,
    emailIds,
    designations,
    firstProfessionDate,
    finalProfessionDate,
    ordinationDate,
  } = req.body;

  const { province_code } = req.query;

  try {
    const filters = {};
    const confrerCodeSets = [];

    // Province filter
    if (province_code && province_code !== "ALL") {
      filters.province_code = { equals: province_code };
    }

    // Name filtering
    if (names && names.length > 0) {
      filters.OR = names.map((name) => ({
        OR: [
          { first_name: { contains: name, mode: "insensitive" } },
          { middle_name: { contains: name, mode: "insensitive" } },
          { last_name: { contains: name, mode: "insensitive" } },
        ],
      }));
    }

    if (dob) filters.birth_date = new Date(dob);

    if (contactNumbers && contactNumbers.length > 0) {
      filters.OR = [
        ...(filters.OR || []),
        ...contactNumbers.map((number) => ({
          OR: [
            { personal1_contact_no: BigInt(number) },
            { personal2_contact_no: BigInt(number) },
            { personal3_contact_no: BigInt(number) },
          ],
        })),
      ];
    }

    if (whatsappNumbers && whatsappNumbers.length > 0) {
      filters.OR = [
        ...(filters.OR || []),
        ...whatsappNumbers.map((number) => ({
          OR: [
            { watsup1_no: BigInt(number) },
            { watsup2_no: BigInt(number) },
            { watsup3_no: BigInt(number) },
          ],
        })),
      ];
    }

    if (emailIds && emailIds.length > 0) {
      filters.OR = [
        ...(filters.OR || []),
        ...emailIds.map((email) => ({
          personal_mailid1: { contains: email, mode: "insensitive" },
        })),
      ];
    }

    if (designations && designations.length > 0) {
      filters.member_type_code = { in: designations };
    }

    if (firstProfessionDate) filters.first_profession_date = new Date(firstProfessionDate);
    if (finalProfessionDate) filters.final_profession_date = new Date(finalProfessionDate);
    if (ordinationDate) filters.ordination_date = new Date(ordinationDate);

    // member_type_code query param
    const memberTypeCode = req.query.member_type_code;
    if (memberTypeCode && memberTypeCode !== "ALL") {
      if (province_code === "ALL") {
        // 🔄 Fetch all matching quick_codes for this member type
        const quickcodeNames = await prisma.quickcode_mst.findMany({
          where: {
            quickcode_name: {
              equals: memberTypeCode, // Use name passed from frontend
              mode: "insensitive"
            },
            quick_code_type: 'memtyp' // Or whatever your member type code category is
          },
          select: { quick_code: true }
        });
    
        const codeList = quickcodeNames.map(item => item.quick_code);
        if (codeList.length > 0) {
          filters.member_type_code = { in: codeList };
        } else {
          filters.member_type_code = memberTypeCode; // fallback
        }
      } else {
        filters.member_type_code = memberTypeCode;
      }
    }
    

   // designation_code
const designationCode = req.query.designation_code;
if (designationCode && designationCode !== "ALL") {
  let designationCodes = [];

  if (province_code === "ALL") {
    const designationQuickcodes = await prisma.quickcode_mst.findMany({
      where: {
        quickcode_name: { equals: designationCode, mode: "insensitive" },
        quick_code_type: "destyp", // Update this if your actual quick_code_type differs
      },
      select: { quick_code: true },
    });
    designationCodes = designationQuickcodes.map(d => d.quick_code);
  } else {
    designationCodes = [designationCode];
  }

  if (designationCodes.length > 0) {
    const codes = await prisma.appoint_transfer_dtl.findMany({
      where: { designation_code: { in: designationCodes } },
      select: { confrer_code: true },
    });
   if (codes.length === 0) {
    return res.status(200).json({ success: true, data: [] });
  }

  confrerCodeSets.push(new Set(codes.map((c) => c.confrer_code)));
  }
}

    // Centre filters
   const centreFilters = {};
const multiCodeKeys = ["apostolate_code", "centre_type_code"];

for (const key of ["apostolate_code", "centre_type_code", "country_code", "state_code"]) {
  const val = req.query[key];
  if (val && val !== "ALL") {
    if (multiCodeKeys.includes(key) && typeof val === "string" && val.includes(",")) {
      const values = val.split(",").map(v => v.trim());
      centreFilters[key] = { in: values };
    } else {
      centreFilters[key] = val;
    }
  }
}


    // Handle diocese_code as name when province_code === "ALL"
if (req.query.diocese_code && req.query.diocese_code !== "ALL") {
  if (province_code === "ALL") {
    const dioceseQuickcodes = await prisma.quickcode_mst.findMany({
      where: {
        quickcode_name: { equals: req.query.diocese_code, mode: "insensitive" },
        quick_code_type: "diocse", // Replace with actual type for dioceses
      },
      select: { quick_code: true },
    });
    const dioceseCodes = dioceseQuickcodes.map(d => d.quick_code);
    if (dioceseCodes.length > 0) {
      centreFilters.diocese_code = { in: dioceseCodes };
    }
  } else {
    centreFilters.diocese_code = req.query.diocese_code;
  }
}

    if (Object.keys(centreFilters).length > 0) {
      const centres = await prisma.centre_dtl.findMany({
        where: centreFilters,
        select: { centre_code: true },
      });

      const centreCodes = centres.map((c) => c.centre_code);
      if (centreCodes.length === 0) {
        return res.status(200).json({ success: true, data: [] }); // no matching centres
      }

      const appoints = await prisma.appoint_transfer_dtl.findMany({
        where: { centre_code: { in: centreCodes } },
        select: { confrer_code: true },
      });

      if (appoints.length === 0) {
        return res.status(200).json({ success: true, data: [] }); // no appoints for given centres
      }

      confrerCodeSets.push(new Set(appoints.map((a) => a.confrer_code)));
    }
    // Centre name/place
    const centreNameFilters = [];
    if (req.query.centre_name && req.query.centre_name !== "ALL") {
      centreNameFilters.push({ centre_name: { contains: req.query.centre_name, mode: "insensitive" } });
    }
    if (req.query.centre_place && req.query.centre_place !== "ALL") {
      centreNameFilters.push({ centre_place: { contains: req.query.centre_place, mode: "insensitive" } });
    }
    if (centreNameFilters.length > 0) {
      const centres = await prisma.centre_dtl.findMany({ where: { OR: centreNameFilters }, select: { centre_code: true } });
      const appoints = await prisma.appoint_transfer_dtl.findMany({
        where: { centre_code: { in: centres.map((c) => c.centre_code) } },
        select: { confrer_code: true },
      });
      if (appoints.length > 0) confrerCodeSets.push(new Set(appoints.map((a) => a.confrer_code)));
    }

    // Division filters
    const appointFilters = [];
  if (req.query.division_type_code && req.query.division_type_code !== "ALL") {
  let codeList = [];

  if (Array.isArray(req.query.division_type_code)) {
    codeList = req.query.division_type_code;
  } else if (typeof req.query.division_type_code === "string") {
    codeList = req.query.division_type_code.split(',').map(code => code.trim());
  }

  if (codeList.length > 0) {
    appointFilters.push({ division_type_code: { in: codeList } });
  }
}

    if (req.query.division_code && req.query.division_code !== "ALL") {
      appointFilters.push({ division_code: req.query.division_code });
    }
    if (appointFilters.length > 0) {
      const appoints = await prisma.appoint_transfer_dtl.findMany({
        where: appointFilters.length === 1 ? appointFilters[0] : { AND: appointFilters },
        select: { confrer_code: true },
      });
      if (appoints.length > 0) confrerCodeSets.push(new Set(appoints.map((a) => a.confrer_code)));
    }

    // Combine confrer_code sets
    if (confrerCodeSets.length > 0) {
      let intersection = [...confrerCodeSets[0]];
      for (let i = 1; i < confrerCodeSets.length; i++) {
        intersection = intersection.filter((code) => confrerCodeSets[i].has(code));
      }
      filters.confrer_code = { in: intersection };
    }

    // Final fetch
    const confreres = await prisma.confreres_dtl.findMany({
      where: filters,
      select: {
        confrer_code: true,
        province_code: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        birth_date: true,
        personal1_contact_no: true,
        watsup1_no: true,
        personal_mailid1: true,
        first_profession_date: true,
        final_profession_date: true,
        ordination_date: true,
        member_type_code: true,
      },
    });

    const confrerCodes = confreres.map((c) => c.confrer_code);

    const memberTypeData = await prisma.quickcode_mst.findMany({
      where: { quick_code: { in: confreres.map((c) => c.member_type_code).filter(Boolean) } },
      select: { quick_code: true, quickcode_name: true },
    });
    const memberTypeMap = Object.fromEntries(memberTypeData.map((d) => [d.quick_code, d.quickcode_name]));

    const designationData = await prisma.appoint_transfer_dtl.findMany({
      where: { confrer_code: { in: confrerCodes } },
      select: { confrer_code: true, designation_code: true },
    });
    const designationMap = Object.fromEntries(designationData.map((d) => [d.confrer_code, d.designation_code]));

    const designationCodes = [...new Set(designationData.map((d) => d.designation_code))];
    const quickCodeData = await prisma.quickcode_mst.findMany({
      where: { quick_code: { in: designationCodes } },
      select: { quick_code: true, quickcode_name: true },
    });
    const quickCodeMap = Object.fromEntries(quickCodeData.map((q) => [q.quick_code, q.quickcode_name]));

    const appointData = await prisma.appoint_transfer_dtl.findMany({
      where: { confrer_code: { in: confrerCodes } },
      select: { confrer_code: true, centre_code: true },
    });

    const confrerToCentresMap = {};
    appointData.forEach(({ confrer_code, centre_code }) => {
      if (!confrerToCentresMap[confrer_code]) {
        confrerToCentresMap[confrer_code] = new Set();
      }
      confrerToCentresMap[confrer_code].add(centre_code);
    });

    const centreCodes = [...new Set(appointData.map((a) => a.centre_code))];

    const centres = await prisma.centre_dtl.findMany({
      where: { centre_code: { in: centreCodes } },
      select: {
        centre_code: true,
        centre_name: true,
        centre_place: true,
        address1: true,
        address2: true,
      },
    });

    const centreMap = Object.fromEntries(
      centres.map((c) => [
        c.centre_code,
        {
          name: c.centre_name || 'N/A',
          place: c.centre_place || 'N/A',
          address: [c.address1, c.address2].filter(Boolean).join(', ') || 'N/A',
        },
      ])
    );

    const formatDate = (d) => {
      if (!d) return "N/A";
      const date = new Date(d);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const formattedData = confreres.map((c) => {
      const fullName = `${c.first_name} ${c.middle_name || ""} ${c.last_name || ""}`.trim();
      const desigCode = designationMap[c.confrer_code];
      const desigName = quickCodeMap[desigCode] || "N/A";

      const centreAddresses = Array.from(confrerToCentresMap[c.confrer_code] || []).map((code) => {
        const info = centreMap[code] || { name: "N/A", place: "N/A", address: "N/A" };
        return {
          centreName: info.name,
          centrePlace: info.place,
          centreAddress: info.address,
        };
      });

      return {
        name: fullName,
        dob: `${formatDate(c.birth_date)} (${fullName})`,
        contactNumber: `${c.personal1_contact_no || ""} (${fullName})`,
        whatsappNumber: `${c.watsup1_no || ""} (${fullName})`,
        emailId: `${c.personal_mailid1 || ""} (${fullName})`,
        designation: `${desigName} (${fullName})`,
        firstProfessionDate: formatDate(c.first_profession_date),
        finalProfessionDate: formatDate(c.final_profession_date),
        ordinationDate: formatDate(c.ordination_date),
        addresses: centreAddresses ,
      };
    });

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    next(error);
  }
};




export const getCenterReportdata = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      const errorMessage = error.name === "TokenExpiredError" ? "Token has expired" : "Invalid token";
      return res.status(401).json({ error: errorMessage });
    }

    const provinceName = decoded.province_name;

    const province = await prisma.province_mst.findFirst({
      where: { province_name: provinceName },
      select: { province_code: true },
    });

    if (!province) {
      return res.status(404).json({ error: "Province not found for the given name" });
    }

    const province_code = province.province_code;

    // Base filter for province
    const centreFilters = { province_code };

    // Add filters for additional fields
    const filterFields = [
      "division_type_code",
      "division_code",
      "centre_type_code",
      "apostolate_code",
      "centre_name",
      "centre_place",
      "diocese_code",
      "country_code",
      "state_code",
    ];

    for (const field of filterFields) {
      if (req.query[field]) {
        centreFilters[field] = req.query[field];
      }
    }

    const centres = await prisma.centre_dtl.findMany({
      where: centreFilters,
      select: {
        centre_code: true,
        centre_name: true,
        centre_place: true,
        community_house_code: true,
        diocese_code: true,
        address1: true,
        address2: true,
        city_dist: true,
        state_code: true,
        country_code: true,
        phone1_no: true,
        phone2_no: true,
        phone3_no: true,
        watsup_no: true,
        office_mailid1: true,
      },
    });

    if (!centres.length) {
      return res.status(200).json({ message: "No centre details found", data: [] });
    }

    const groupedResponse = {};

    for (const centre of centres) {
      const diocese = await prisma.quickcode_mst.findFirst({
        where: { quick_code: centre.diocese_code },
        select: { quickcode_name: true },
      });

      const dioceseName = diocese?.quickcode_name || "Unknown Diocese";

      let communityHouseName = null;
      if (centre.community_house_code) {
        const communityHouse = await prisma.community_house_dtl.findFirst({
          where: { community_house_code: centre.community_house_code },
          select: { community_house_name: true },
        });
        communityHouseName = communityHouse?.community_house_name || null;
      }

      const appointDetails = await prisma.appoint_transfer_dtl.findMany({
        where: { centre_code: centre.centre_code },
        select: { confrer_code: true, designation_code: true },
      });

      // const confrereCodes = appointDetails.map((detail) => detail.confrer_code);


      let confrereCodes = [];
      let designationCodes = [];

      // Filter by `designation_code` if provided
      if (req.query.designation_code) {
        const filteredAppointDetails = appointDetails.filter(
          (detail) => detail.designation_code === req.query.designation_code
        );

        // Update `confrereCodes` and `designationCodes` based on the filtered appoint details
        confrereCodes = filteredAppointDetails.map((detail) => detail.confrer_code);
        designationCodes = filteredAppointDetails.map((detail) => detail.designation_code);

        // Skip this center if no matching `designation_code`
        if (!filteredAppointDetails.length) continue;
      } else {
        // Default behavior: Get all confrer_codes and designation_codes
        confrereCodes = appointDetails.map((detail) => detail.confrer_code);
        designationCodes = appointDetails.map((detail) => detail.designation_code);
      }

      // Filter confreres by `member_type_code` only if provided
      if (req.query.member_type_code) {
        const filteredConfreres = await prisma.confreres_dtl.findMany({
          where: {
            confrer_code: { in: confrereCodes },
            member_type_code: req.query.member_type_code,
          },
          select: { confrer_code: true },
        });



        confrereCodes = filteredConfreres.map((confrere) => confrere.confrer_code);

        // Skip this center if no confreres match the `member_type_code`
        if (!confrereCodes.length) continue;
      }

      const confreres = await prisma.confreres_dtl.findMany({
        where: { confrer_code: { in: confrereCodes } },
        select: {
          confrer_code: true,
          first_name: true,
          middle_name: true,
          last_name: true,
          personal1_contact_no: true,
          member_type_code: true,
        },
      });

      const designations = await prisma.quickcode_mst.findMany({
        where: { quick_code: { in: appointDetails.map((detail) => detail.designation_code) } },
        select: {
          quick_code: true,
          quickcode_name: true,
        },
      });

      const designationMap = designations.reduce((acc, item) => {
        acc[item.quick_code] = item.quickcode_name;
        return acc;
      }, {});

      const confrereDetails = confreres.map((confrere) => {
        const designationCode = appointDetails.find(
          (detail) => detail.confrer_code === confrere.confrer_code
        )?.designation_code;

        return {
          name: [confrere.first_name, confrere.middle_name, confrere.last_name]
            .filter(Boolean)
            .join(" "),
          contact: confrere.personal1_contact_no?.toString() || "N/A",
          designation: designationCode ? designationMap[designationCode] : "N/A",
          member_type: confrere.member_type_code || "N/A",
        };
      });

      const addressParts = [
        centre.address1,
        centre.address2,
        centre.city_dist,
        centre.state_code,
        centre.country_code,
      ];
      const formattedAddress = addressParts.filter(Boolean).join(", ");

      const centreContactDetails = {
        phone1_no: centre.phone1_no?.toString() || "N/A",
        phone2_no: centre.phone2_no?.toString() || "N/A",
        phone3_no: centre.phone3_no?.toString() || "N/A",
        watsup_no: centre.watsup_no?.toString() || "N/A",
        office_mailid1: centre.office_mailid1 || "N/A",
      };

      if (!groupedResponse[dioceseName]) {
        groupedResponse[dioceseName] = {
          diocese_name: dioceseName,
          centres: {},
        };
      }

      if (!groupedResponse[dioceseName].centres[centre.centre_place]) {
        groupedResponse[dioceseName].centres[centre.centre_place] = {};
      }

      if (!groupedResponse[dioceseName].centres[centre.centre_place][communityHouseName]) {
        groupedResponse[dioceseName].centres[centre.centre_place][communityHouseName] = [];
      }

      groupedResponse[dioceseName].centres[centre.centre_place][communityHouseName].push({
        centre_name: centre.centre_name,
        centre_address: formattedAddress,
        centreContactDetails,
        confreres: confrereDetails,
      });
    }

    const safeResponse = JSON.stringify(Object.values(groupedResponse), (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );


    res.status(200).send(safeResponse);
  } catch (error) {
    console.error("Error fetching centre details:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};



export const getDivisionCounts = async (req, res) => {
  try {
    const { province_code } = req.query;

    const validQuickcodeNames = ["Province", "Region", "Mission", "Delegation"];

    // 1. Get all quick codes for those 4 types (across all provinces if ALL)
    const quickCodeWhere = {
      quick_code_type: 'divtyp',
      quickcode_name: {
        in: validQuickcodeNames,
        mode: 'insensitive',
      },
    };

    if (province_code && province_code !== 'ALL') {
      quickCodeWhere.province_code = province_code;
    }

    const quickCodes = await prisma.quickcode_mst.findMany({
      where: quickCodeWhere,
      select: {
        quick_code: true,
        quickcode_name: true,
      },
    });

    // Build unique name → code mapping (might have multiple same-named codes across provinces)
    const quickCodeMap = {};
    for (const name of validQuickcodeNames) {
      quickCodeMap[name] = quickCodes
        .filter((qc) => qc.quickcode_name.toLowerCase() === name.toLowerCase())
        .map((qc) => qc.quick_code);
    }

    // 2. Fetch counts from division_setup_mst across matching quick codes
    const result = {};
    for (const name of validQuickcodeNames) {
      const codes = quickCodeMap[name];
      if (!codes || codes.length === 0) {
        result[name] = 0;
        continue;
      }

      const whereClause = {
        division_type_code: { in: codes },
      };
      if (province_code && province_code !== 'ALL') {
        whereClause.province_code = province_code;
      }

      const count = await prisma.division_setup_mst.count({ where: whereClause });
      result[name] = count;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getDivisionCounts:", error);
    res.status(500).json({ message: "Internal server error while fetching division counts." });
  }
};





export const CenterReportdata = async (req, res) => {
  try {
    console.log("📥 Received Query Params:", req.query);

    const {
      province_code,
      division_type_code,
      division_code,
      centre_type_code,
      apostolate_name,
      apostolate_code,
      centre_name,
      centre_place,
      diocese_code,
      country_code,
      state_code,
      designation_code,
      member_type_code,
      community_house_code,
    } = req.query;

    const centreFilters = {};
    const baseFields = [
      "province_code",
      "division_code",
      "centre_type_code",
      "centre_name",
      "centre_place",
      "diocese_code",
      "country_code",
      "state_code",
      "community_house_code",
    ];

    for (const field of baseFields) {
      if (req.query[field] && req.query[field] !== "ALL") {
        centreFilters[field] = { equals: req.query[field], mode: "insensitive" };
      }
    }

    // ✅ Handle multiple division_type_codes
    if (division_type_code && division_type_code !== "ALL") {
      const divisionCodes = division_type_code.split(',').map(code => code.trim());
      centreFilters.division_type_code = { in: divisionCodes };
    }

    // ✅ Handle apostolate name/code
    let apostolateCodes = [];
    if (province_code === "ALL" && apostolate_name && apostolate_name !== "ALL") {
      const apostolateGroup = await prisma.quickcode_mst.findMany({
        where: {
          quick_code_type: "apostl",
          quickcode_name: apostolate_name
        },
        select: { quick_code: true }
      });
      apostolateCodes = apostolateGroup.map(item => item.quick_code);
    } else if (apostolate_code && apostolate_code !== "ALL") {
      apostolateCodes = apostolate_code.split(',').map(code => code.trim());
    }

    if (apostolateCodes.length > 0) {
      centreFilters.apostolate_code = { in: apostolateCodes };
    }

    // ✅ Handle diocese code/name
    if (diocese_code && diocese_code !== "ALL") {
      let dioceseCodes = [];

      if (province_code === "ALL") {
        const group = await prisma.quickcode_mst.findMany({
          where: {
            quick_code_type: "diocse",
            quickcode_name: diocese_code,
          },
          select: { quick_code: true },
        });
        dioceseCodes = group.map((item) => item.quick_code);
      } else {
        dioceseCodes = [diocese_code];
      }

      centreFilters.diocese_code = { in: dioceseCodes };
    }

    // ✅ Get Centres
    const centres = await prisma.centre_dtl.findMany({
      where: centreFilters,
      select: {
        centre_code: true,
        province_code: true,
        centre_name: true,
        centre_place: true,
        community_house_code: true,
        diocese_code: true,
        address1: true,
        address2: true,
        city_dist: true,
        state_code: true,
        country_code: true,
        phone1_no: true,
        phone2_no: true,
        phone3_no: true,
        watsup_no: true,
        office_mailid1: true,
      },
    });

    if (!centres.length) return res.status(200).json([]);

    const nestedData = {};

    for (const centre of centres) {
      const diocese = await prisma.quickcode_mst.findFirst({
        where: { quick_code: centre.diocese_code },
        select: { quickcode_name: true },
      });
      const dioceseName = diocese?.quickcode_name || "Unknown Diocese";

      const communityHouseCodeFinal =
        community_house_code && community_house_code !== "ALL"
          ? community_house_code
          : centre.community_house_code;

      const communityHouse = await prisma.community_house_dtl.findFirst({
        where: { community_house_code: communityHouseCodeFinal },
        select: { community_house_name: true },
      });
      const communityHouseName = communityHouse?.community_house_name || "Unknown Community House";

      const appointDetails = await prisma.appoint_transfer_dtl.findMany({
        where: { centre_code: centre.centre_code },
        select: { confrer_code: true, designation_code: true },
      });

      let confrereCodes = appointDetails.map((d) => d.confrer_code);

      // ✅ Filter by designation_code
      if (designation_code && designation_code !== "ALL") {
        let designationCodes = [];

        if (province_code === "ALL") {
          const group = await prisma.quickcode_mst.findMany({
            where: {
              quick_code_type: "destyp",
              quickcode_name: designation_code,
            },
            select: { quick_code: true },
          });
          designationCodes = group.map((item) => item.quick_code);
        } else {
          designationCodes = [designation_code];
        }

        confrereCodes = appointDetails
          .filter((d) => designationCodes.includes(d.designation_code))
          .map((d) => d.confrer_code);

        if (!confrereCodes.length) continue;
      }

      // ✅ Filter by member_type_code
      if (member_type_code && member_type_code !== "ALL") {
        let typeCodes = [];

        if (province_code === "ALL") {
          const typeGroup = await prisma.quickcode_mst.findMany({
            where: {
              quick_code_type: "memtyp",
              quickcode_name: member_type_code,
            },
            select: { quick_code: true },
          });
          typeCodes = typeGroup.map((item) => item.quick_code);
        } else {
          typeCodes = [member_type_code];
        }

        const confreresWithType = await prisma.confreres_dtl.findMany({
          where: {
            confrer_code: { in: confrereCodes },
            member_type_code: { in: typeCodes },
          },
          select: { confrer_code: true },
        });

        confrereCodes = confreresWithType.map((c) => c.confrer_code);
        if (!confrereCodes.length) continue;
      }

      const confreres = await prisma.confreres_dtl.findMany({
        where: { confrer_code: { in: confrereCodes } },
        select: {
          confrer_code: true,
          first_name: true,
          middle_name: true,
          last_name: true,
          personal1_contact_no: true,
        },
      });

      const designationMap = await prisma.quickcode_mst.findMany({
        where: {
          quick_code: {
            in: appointDetails.map((d) => d.designation_code),
          },
        },
        select: { quick_code: true, quickcode_name: true },
      }).then((items) =>
        items.reduce((map, d) => {
          map[d.quick_code] = d.quickcode_name;
          return map;
        }, {})
      );

      const confrereList = confreres.map((c) => {
        const designationCode = appointDetails.find((d) => d.confrer_code === c.confrer_code)?.designation_code;
        return {
          name: [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" "),
          designation: designationMap[designationCode] || "N/A",
          contact: c.personal1_contact_no?.toString() || "N/A",
        };
      });

      const address = [centre.address1, centre.address2, centre.city_dist, centre.state_code, centre.country_code]
        .filter(Boolean)
        .join(", ");

      const contactDetails = {
        phone1_no: centre.phone1_no?.toString() || "N/A",
        phone2_no: centre.phone2_no?.toString() || "N/A",
        phone3_no: centre.phone3_no?.toString() || "N/A",
        watsup_no: centre.watsup_no?.toString() || "N/A",
        office_mailid1: centre.office_mailid1 || "N/A",
      };

      // ✅ Build nested response
      if (!nestedData[dioceseName]) nestedData[dioceseName] = {};
      if (!nestedData[dioceseName][centre.centre_place]) nestedData[dioceseName][centre.centre_place] = {};
      if (!nestedData[dioceseName][centre.centre_place][communityHouseName]) {
        nestedData[dioceseName][centre.centre_place][communityHouseName] = [];
      }

      nestedData[dioceseName][centre.centre_place][communityHouseName].push({
        centre_name: centre.centre_name,
        centre_address: address,
        centreContactDetails: contactDetails,
        confreres: confrereList,
      });
    }

    const finalResponse = Object.entries(nestedData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([diocese_name, centres]) => ({
        diocese_name,
        centres,
      }));

    res.status(200).json(finalResponse);
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



export const getAllProvinceFilters = async (req, res) => {
  try {
    const {
      province_code,
      division_type_code,
      apostolate_name,
      apostolate_code,
      centre_type_code,
      country_code,
    } = req.query;

    if (!province_code) {
      return res.status(400).json({ error: 'province_code is required.' });
    }

    // Fetch static filters
    const [
      divisionTypesRaw,
      memberTypesRaw,
      apostolatesRaw,
      diocesesRaw,
      designationsRaw,
       countriesRaw,
      statesRaw
    ] = await Promise.all([
      prisma.quickcode_mst.findMany({ where: { quick_code_type: 'divtyp' }, orderBy: { quickcode_name: 'asc' }, }),
      prisma.quickcode_mst.findMany({ where: { quick_code_type: 'memtyp' }, orderBy: { quickcode_name: 'asc' }, }),
      prisma.quickcode_mst.findMany({ where: { quick_code_type: 'apostl' }, orderBy: { quickcode_name: 'asc' }, }),
      prisma.quickcode_mst.findMany({ where: { quick_code_type: 'diocse' }, orderBy: { quickcode_name: 'asc' }, }),
      prisma.quickcode_mst.findMany({ where: { quick_code_type: 'destyp' }, orderBy: { quickcode_name: 'asc' }, }),
      prisma.country_mst.findMany({orderBy: { country_name: 'asc' },}),
      country_code && country_code !== 'ALL'
        ? prisma.state_mst.findMany({ where: { country_code },orderBy: { state_name: 'asc' }, })
        : prisma.state_mst.findMany({orderBy: { state_name: 'asc' },
}),
    ]);

    // ✅ Deduplicate countries by country_name
    const countryMap = {};
    countriesRaw.forEach((c) => {
      countryMap[c.country_name] = c;
    });
    const countries = Object.values(countryMap);

    // ✅ Deduplicate states if province is ALL
    let states = [];
    if (province_code === 'ALL') {
      const stateMap = {};
      statesRaw.forEach((s) => {
        const key = `${s.state_name}_${s.country_code}`;
        if (!stateMap[key]) stateMap[key] = s;
      });
      states = Object.values(stateMap);
    } else {
      states = statesRaw;
    }

    // Grouped Apostolates
    const apostolateMap = {};
    apostolatesRaw.forEach((item) => {
      const name = item.quickcode_name;
      if (!apostolateMap[name]) {
        apostolateMap[name] = { quickcode_name: name, quick_codes: [] };
      }
      apostolateMap[name].quick_codes.push(item.quick_code);
    });
    const apostolates = Object.values(apostolateMap);

    // Determine which apostolate codes to use
    let activeApostolateCodes = [];

    if (province_code === 'ALL') {
      if (apostolate_name && apostolateMap[apostolate_name]) {
        activeApostolateCodes = apostolateMap[apostolate_name].quick_codes;
      }
    } else {
      if (apostolate_code && apostolate_code !== 'ALL') {
        activeApostolateCodes = [apostolate_code];
      }
    }

    // Group Division Types
    const divisionTypeMap = {};
    divisionTypesRaw.forEach((item) => {
      const key = item.quickcode_name.toLowerCase();
      if (!divisionTypeMap[key]) {
        divisionTypeMap[key] = { quickcode_name: item.quickcode_name, quick_codes: [] };
      }
      divisionTypeMap[key].quick_codes.push(item.quick_code);
    });
    const divisionTypes = Object.values(divisionTypeMap);

    // Group Member Types
    const memberTypeMap = {};
    memberTypesRaw.forEach((item) => {
      const name = item.quickcode_name;
      if (!memberTypeMap[name]) {
        memberTypeMap[name] = { quickcode_name: name, quick_codes: [] };
      }
      memberTypeMap[name].quick_codes.push(item.quick_code);
    });
    const memberTypes = Object.values(memberTypeMap);

    // Group Designations
    const designationMap = {};
    designationsRaw.forEach((item) => {
      const name = item.quickcode_name;
      if (!designationMap[name]) {
        designationMap[name] = { quickcode_name: name, quick_codes: [] };
      }
      designationMap[name].quick_codes.push(item.quick_code);
    });
    const designations = Object.values(designationMap);

    // Group Dioceses
    const dioceseMap = {};
    diocesesRaw.forEach((item) => {
      const name = item.quickcode_name;
      if (!dioceseMap[name]) {
        dioceseMap[name] = { quickcode_name: name, quick_codes: [] };
      }
      dioceseMap[name].quick_codes.push(item.quick_code);
    });
    const dioceses = Object.values(dioceseMap);

    // Get division names
    let divisionNames = [];
    if (division_type_code && division_type_code !== 'ALL') {
      const quickCodes = divisionTypesRaw
        .filter((item) => item.quickcode_name === division_type_code)
        .map((item) => item.quick_code);

      divisionNames = await prisma.division_setup_mst.findMany({
        where: { division_type_code: { in: quickCodes } },
        select: { division_code: true, division_name: true },
      });
    }

    // Fetch Centre Types
    let centreTypes = [];
    if (activeApostolateCodes.length === 0) {
      const centreTypesRaw = await prisma.quickcode_mst.findMany({
        where: { quick_code_type: 'ctrtyp' },
        select: { quick_code: true, quickcode_name: true },
         orderBy: { quickcode_name: 'asc' }
      });
      centreTypes = centreTypesRaw.map((item) => ({
        centre_type_code: item.quick_code,
        centre_type_name: item.quickcode_name,
      }));
    } else {
      const rawCentreTypes = await prisma.apostolates_mst.findMany({
        where: { apostolate_code: { in: activeApostolateCodes } },
        select: {
          centre_type_code: true,
          centre_type_name: true,
        },
        distinct: ['centre_type_code'],
        orderBy: { centre_type_name: 'asc' },
      });

      centreTypes = Object.values(
        rawCentreTypes.reduce((acc, curr) => {
          acc[curr.centre_type_code] = curr;
          return acc;
        }, {})
      );
    }

    // Fetch Centre Details
    let centreDetails = [];
    const centreOrder = [
  { centre_name: 'asc' },
  { centre_place: 'asc' }
];
    if (activeApostolateCodes.length === 0) {
      centreDetails = await prisma.centre_dtl.findMany({
        select: { centre_name: true, centre_place: true },
         orderBy: centreOrder,
        
      });
    } else {
      const centreWhere = {
        apostolate_code: { in: activeApostolateCodes },
        ...(centre_type_code && centre_type_code !== 'ALL' && { centre_type_code }),
      };

      centreDetails = await prisma.centre_dtl.findMany({
        where: centreWhere,
        select: { centre_name: true, centre_place: true },
         orderBy: centreOrder,
      });
    }

    // ✅ Final Response
    res.json({
      divisionTypes,
      divisionNames,
      memberTypes,
      apostolates,
      centreTypes,
      dioceses,
      designations,
      countries,
      states,
      centreDetails,
    });
  } catch (error) {
    console.error('❌ Error in getAllProvinceFilters:', error);
    res.status(500).json({ error: 'Failed to fetch filter data' });
  }
};

function convertBigIntToString(obj) {
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, convertBigIntToString(v)])
    );
  } else if (typeof obj === 'bigint') {
    return obj.toString();
  }
  return obj;
}

export const getComprehensiveConfrereReport = async (req, res) => {
  const { search = "" } = req.query;
  const trimmedSearch = search.trim();

  if (!trimmedSearch) {
    return res.status(400).json({ error: "Search query is required." });
  }

  try {
    const isNumeric = /^\d+$/.test(trimmedSearch);

    // 1. 🔍 Search Confreres
    const confreresRaw = await prisma.confreres_dtl.findMany({
      where: {
        OR: [
          { first_name: { contains: trimmedSearch, mode: "insensitive" } },
          { middle_name: { contains: trimmedSearch, mode: "insensitive" } },
          { last_name: { contains: trimmedSearch, mode: "insensitive" } },
          { personal_mailid1: { contains: trimmedSearch, mode: "insensitive" } },
          ...(isNumeric
            ? [
                { personal1_contact_no: BigInt(trimmedSearch) },
                { watsup1_no: BigInt(trimmedSearch) },
              ]
            : []),
        ],
      },
      select: {
        confrer_code: true,
        first_name: true,
        middle_name: true,
        last_name: true,
        personal_mailid1: true,
        personal1_contact_no: true,
        birth_date: true,
        watsup1_no: true,
        first_profession_date: true,
        final_profession_date: true,
        ordination_date: true,
        member_type_code: true,
      }
    });
    const confrerCodes = confreresRaw.map((c) => c.confrer_code);

    const designationData = await prisma.appoint_transfer_dtl.findMany({
      where: { confrer_code: { in: confrerCodes } },
      select: { confrer_code: true, designation_code: true, centre_code: true },
    });

    const designationMap = Object.fromEntries(
      designationData.map((d) => [d.confrer_code, d.designation_code])
    );
    const designationCodes = [...new Set(designationData.map((d) => d.designation_code))];

    const designationNames = await prisma.quickcode_mst.findMany({
      where: { quick_code: { in: designationCodes } },
      select: { quick_code: true, quickcode_name: true },
    });

    const designationNameMap = Object.fromEntries(
      designationNames.map((d) => [d.quick_code, d.quickcode_name])
    );

    const centreCodes = designationData.map((d) => d.centre_code);

    const centres = await prisma.centre_dtl.findMany({
      where: { centre_code: { in: centreCodes } },
      select: {
        centre_code: true,
        centre_name: true,
        centre_place: true,
        address1: true,
        address2: true,
      },
    });

    const centreMap = Object.fromEntries(
      centres.map((c) => [
        c.centre_code,
        {
          centreName: c.centre_name || "N/A",
          centrePlace: c.centre_place || "N/A",
          centreAddress: [c.address1, c.address2].filter(Boolean).join(", ") || "N/A",
        },
      ])
    );

    const confrerToCentresMap = {};
    designationData.forEach(({ confrer_code, centre_code }) => {
      if (!confrerToCentresMap[confrer_code]) confrerToCentresMap[confrer_code] = new Set();
      confrerToCentresMap[confrer_code].add(centre_code);
    });

    const formatDate = (d) => {
      if (!d) return "N/A";
      const date = new Date(d);
      return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
    };

    const confrereResults = confreresRaw.map((c) => {
      const fullName = `${c.first_name} ${c.middle_name || ""} ${c.last_name || ""}`.trim();
      const desigCode = designationMap[c.confrer_code];
      const desigName = designationNameMap[desigCode] || "N/A";

      const centreAddresses = Array.from(confrerToCentresMap[c.confrer_code] || []).map(
        (code) => centreMap[code] || { centreName: "N/A", centrePlace: "N/A", centreAddress: "N/A" }
      );

      return {
        name: fullName,
        dob: formatDate(c.birth_date),
        contactNumber: c.personal1_contact_no?.toString() || "N/A",
        whatsappNumber: c.watsup1_no?.toString() || "N/A",
        emailId: c.personal_mailid1 || "N/A",
        designation: desigName,
        firstProfessionDate: formatDate(c.first_profession_date),
        finalProfessionDate: formatDate(c.final_profession_date),
        ordinationDate: formatDate(c.ordination_date),
        addresses: centreAddresses,
      };
    });

   // Step 1: Fetch all centers
const allCenters = await prisma.centre_dtl.findMany({
  select: {
    centre_code: true,
    centre_name: true,
    centre_place: true,
    community_house_code: true,
    diocese_code: true,
    address1: true,
    address2: true,
    city_dist: true,
    state_code: true,
    country_code: true,
    phone1_no: true,
    phone2_no: true,
    phone3_no: true,
    watsup_no: true,
    office_mailid1: true,
  }
});

const lowerSearch = trimmedSearch.toLowerCase();

const flattenedCenterArray = [];

for (const center of allCenters) {
  const diocese = await prisma.quickcode_mst.findFirst({
    where: { quick_code: center.diocese_code },
    select: { quickcode_name: true },
  });

  const communityHouse = await prisma.community_house_dtl.findFirst({
    where: { community_house_code: center.community_house_code },
    select: { community_house_name: true },
  });

  const appoints = await prisma.appoint_transfer_dtl.findMany({
    where: { centre_code: center.centre_code },
    select: { confrer_code: true, designation_code: true },
  });

  const confrerCodes = appoints.map(a => a.confrer_code);

  const confrereDetails = await prisma.confreres_dtl.findMany({
    where: { confrer_code: { in: confrerCodes } },
    select: {
      confrer_code: true,
      first_name: true,
      middle_name: true,
      last_name: true,
      personal1_contact_no: true
    }
  });

  const designationMap = await prisma.quickcode_mst.findMany({
    where: {
      quick_code: {
        in: appoints.map((a) => a.designation_code)
      }
    },
    select: { quick_code: true, quickcode_name: true }
  }).then(list => list.reduce((map, item) => {
    map[item.quick_code] = item.quickcode_name;
    return map;
  }, {}));

  const confrereList = confrereDetails.map(c => {
    const desigCode = appoints.find(a => a.confrer_code === c.confrer_code)?.designation_code;
    const designation = designationMap[desigCode] || "N/A";
    const fullName = [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ");
    const contact = c.personal1_contact_no?.toString() || "N/A";

    return {
      name: fullName,
      designation,
      contact,
      _match: [fullName, designation, contact].some(field =>
        field.toLowerCase().includes(lowerSearch)
      )
    };
  });

  const centerMatchesByName =
    (center.centre_name?.toLowerCase().includes(lowerSearch) ||
       center.centre_place?.toLowerCase().includes(lowerSearch) ||
          diocese?.quickcode_name?.toLowerCase().includes(lowerSearch) ||
          communityHouse?.community_house_name?.toLowerCase().includes(lowerSearch))

  const matchedConfreres = confrereList.filter(c => c._match);

  if (centerMatchesByName || matchedConfreres.length > 0) {
    flattenedCenterArray.push({
      diocese_name: diocese?.quickcode_name || "Unknown Diocese",
      centre_place: center.centre_place || "N/A",
      community_house_name: communityHouse?.community_house_name || "Unknown Community House",
      centre_name: center.centre_name,
      centre_address: [center.address1, center.address2, center.city_dist, center.state_code, center.country_code]
        .filter(Boolean)
        .join(", "),
      centre_contact_details: {
        phone1_no: center.phone1_no?.toString() || "N/A",
        phone2_no: center.phone2_no?.toString() || "N/A",
        phone3_no: center.phone3_no?.toString() || "N/A",
        watsup_no: center.watsup_no?.toString() || "N/A",
        office_mailid1: center.office_mailid1 || "N/A"
      },
      confreres: matchedConfreres.map(({ _match, ...rest }) => rest)
    });
  }
}


  
    return res.status(200).json({
      success: true,
      data: {
        confreres: confrereResults,
        centers: flattenedCenterArray,
        // overall
      }
    });
  } catch (err) {
    console.error("❌ Error in unified search API:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
};




