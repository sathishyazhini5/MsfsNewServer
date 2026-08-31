import { Prisma, PrismaClient } from '@prisma/client';
import { JWT_SECRET } from "../../config/index.js";
import { resolveDataScope, sendScopeError } from '../../utils/dataScope.js';
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";

export const saveHeadquartersDetails = async (req, res) => {
    console.log(req.body)
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
    const createdBy = decoded.role_name || decoded.username || "Unknown";

    // Fetch province_code based on province_name
    const province = await prisma.province_mst.findFirst({
        where: { province_name: provinceName },
        select: { province_code: true },
    });

    if (!province) {
        return res.status(404).json({ error: "Province not found for the given name" });
    }

    const province_code = province.province_code;

    const {
        division_type_code,
        division_code,
        headquarters_name,
        address1,
        address2,
        place,
        city_dist,
        pin_zipcode,
        country_code,
        state_code,
        courier_address1,
        courier_address2,
        courier_place,
        courier_city_dist,
        courier_pin_zipcode,
        courier_country_code,
        courier_state_code,
        other_address1,
        other_address2,
        other_place,
        other_city_dist,
        other_pin_zipcode,
        other_country_code,
        other_state_code,
        phone1_isd,
        phone1_no,
        phone2_isd,
        phone2_no,
        watsup_isd,
        watsup_no,
        office_mailid1,
        office_mailid2,
        office_mailid3,
        website1,
        website2,
        website3,
        secretary_isd,
        secretary_contact_no,
        secretary_mailid,
        bursar_isd,
        bursar_contact_no,
        bursar_mailid,
        language_code = 'en', // Default value
        concurrency_val = 1,  // Default value
        created_by = createdBy, // Default value
         // Default to current date
    } = req.body;

    const created_date = new Date(); // Automatically generate the current date

    try {

        if (!phone1_no || !phone1_isd || !office_mailid1 || !secretary_contact_no || !secretary_isd || !secretary_mailid || !bursar_contact_no || !bursar_isd || !bursar_mailid||
            !headquarters_name ||!address1 ||!place ||!pin_zipcode ||!city_dist ||!country_code ||!state_code|| !division_type_code ||
            !division_code
        ) {
            // Create an array to store missing fields
            const missingFields = [];
          
            if (!phone1_no) missingFields.push("Phone Number 1");
            if (!phone1_isd) missingFields.push("Phone ISD Code 1");
            if (!office_mailid1) missingFields.push("Office Email");
            if (!secretary_contact_no) missingFields.push("Secretary Contact");
            if (!secretary_isd) missingFields.push("Secretary ISD Code");
            if (!secretary_mailid) missingFields.push("Secretary Email");
            if (!bursar_contact_no) missingFields.push("Bursar Contact");
            if (!bursar_isd) missingFields.push("Bursar ISD Code");
            if (!bursar_mailid) missingFields.push("Bursar Email");
            if(!headquarters_name)missingFields.push("Headquarters Name")
            if (!address1) missingFields.push("Address 1");
            if (!place) missingFields.push("Place");
            if (!pin_zipcode) missingFields.push("Pin/Zip Code");
            if (!city_dist) missingFields.push("City/District");
            if (!country_code) missingFields.push("Country Code");
            if (!state_code) missingFields.push("State Code");
            if (!division_type_code) missingFields.push("Division Type Code");
            if (!division_code) missingFields.push("Division Code");
          
            // Construct the error message
            const errorMessage = `Missing required fields: ${missingFields.join(", ")}`;
          
            return res.status(400).json({
              error: errorMessage,
            });
          }
          


    // Sanitize input: Replace empty strings with `null`
    const sanitizedData = {
        place: place?.trim().toUpperCase() || null,
        courier_place: courier_place?.trim().toUpperCase() || null,
        other_place: other_place?.trim().toUpperCase() || null,
        phone2_no: phone2_no ? BigInt(phone2_no) : null,
        phone2_isd: phone2_isd || null,
        watsup_no: watsup_no ? BigInt(watsup_no) : null,
        watsup_isd: watsup_isd || null,
        office_mailid2: office_mailid2 || null,
        office_mailid3: office_mailid3 || null,
        website1: website1 || null,
        website2: website2 || null,
        website3: website3 || null,
      };
        console.log('Received data:', req.body);

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

        // Updated Division Code Check
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
        

        const existingHeadquarters = await prisma.headquarters_dtl.findFirst({
            where: {
                province_code,
                division_type_code,
                division_code,
                headquarters_name: {
                    equals: headquarters_name,
                    mode: 'insensitive', // Ensures case-insensitive comparison
                },
            },
        });

        if (existingHeadquarters) {
            return res.status(409).json({
                error: `Headquarters name  already exists for the specified province, division type, and division`,
            });
        }

        // Fetch the highest existing headquarters_code
        const lastHeadquarters = await prisma.headquarters_dtl.findFirst({
            orderBy: {
                headquarters_code: 'desc'
            }
        });

        // Generate the new headquarters_code
        let newHeadquartersCode = 'HQ001';
        if (lastHeadquarters) {
            const lastCodeNumber = parseInt(lastHeadquarters.headquarters_code.replace('HQ', ''), 10);
            newHeadquartersCode = `HQ${(lastCodeNumber + 1).toString().padStart(3, '0')}`;
        }

        // Save to headquarters_dtl
        const result = await prisma.headquarters_dtl.create({
            data: {
                headquarters_code: newHeadquartersCode,
                province_code,
                division_type_code,
                division_code,
                headquarters_name,
                address1,
                address2,
                place,
                city_dist,
                pin_zipcode,
                country_code,
                state_code,
                courier_address1,
                courier_address2,
                courier_place,
                courier_city_dist,
                courier_pin_zipcode,
                courier_country_code,
                courier_state_code,
                other_address1,
                other_address2,
                other_place,
                other_city_dist,
                other_pin_zipcode,
                other_country_code,
                other_state_code,
                phone1_isd,
                phone1_no,
                ...sanitizedData,
                office_mailid1,
                secretary_isd,
                secretary_contact_no,
                secretary_mailid,
                bursar_isd,
                bursar_contact_no,
                bursar_mailid,
                language_code,
                concurrency_val,
                created_by,
                created_date,
            
            }
        });

        // Convert BigInt fields to string before returning
        const resultToReturn = {
            ...result,
            phone1_no: result.phone1_no ? result.phone1_no.toString() : null,
            phone2_no: result.phone2_no ? result.phone2_no.toString() : null,
            phone3_no: result.phone3_no ? result.phone3_no.toString() : null,
            mobile1_no: result.mobile1_no ? result.mobile1_no.toString() : null,
            mobile2_no: result.mobile2_no ? result.mobile2_no.toString() : null,
            mobile3_no: result.mobile3_no ? result.mobile3_no.toString() : null,
            watsup_no: result.watsup_no ? result.watsup_no.toString() : null,
            fax_no: result.fax_no ? result.fax_no.toString() : null,
            secretary_contact_no: result.secretary_contact_no ? result.secretary_contact_no.toString() : null,
            bursar_contact_no: result.bursar_contact_no ? result.bursar_contact_no.toString() : null
        };

        console.log('Data saved successfully:', resultToReturn);
        return res.status(201).json({ message: 'Data saved successfully', data: resultToReturn });
    } catch (error) {
        console.error('Error saving data:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};




export const updateHeadquartersDetails = async (req, res) => {
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
    const {
        
        division_type_code,
        division_code,
        headquarters_name,
        address1,
        address2,
        place,
        city_dist,
        pin_zipcode,
        country_code,
        state_code,
        courier_address1,
        courier_address2,
        courier_place,
        courier_city_dist,
        courier_pin_zipcode,
        courier_country_code,
        courier_state_code,
        other_address1,
        other_address2,
        other_place,
        other_city_dist,
        other_pin_zipcode,
        other_country_code,
        other_state_code,
        phone1_isd,
        phone1_no,
        phone2_isd,
        phone2_no,
        phone3_isd,
        phone3_no,
        mobile1_isd,
        mobile1_no,
        mobile2_isd,
        mobile2_no,
        mobile3_isd,
        mobile3_no,
        watsup_isd,
        watsup_no,
        fax_isd,
        fax_no,
        office_mailid1,
        office_mailid2,
        office_mailid3,
        website1,
        website2,
        website3,
        secretary_isd,
        secretary_contact_no,
        secretary_mailid,
        bursar_isd,
        bursar_contact_no,
        bursar_mailid,
        language_code = 'en',  // Default value
        concurrency_val = 1,   // Default value
        updated_by=UpdatedBy 
    } = req.body;

    const { headquarters_code } = req.params;  // Extract headquarters_code from URL params
    const updated_date = new Date();           // Automatically generate the current date

      // Validate required fields
    const missingFields = [];
    if (!phone1_no) missingFields.push("Phone Number 1");
    if(!phone1_isd)missingFields.push("Phone isd 1")
    if (!office_mailid1) missingFields.push("Office Email");
    if (!secretary_contact_no) missingFields.push("Secretary Contact Number");
    if(!secretary_isd)missingFields.push("Secretary isd")
    if (!secretary_mailid) missingFields.push("Secretary Email");
    if (!bursar_contact_no) missingFields.push("Bursar Contact Number");
    if(! bursar_isd) missingFields.push("Bursar isd")
    if (!bursar_mailid) missingFields.push("Bursar Email");
    if (!headquarters_name) missingFields.push("Headquarters Name");
    if (!address1) missingFields.push("Address 1");
    if (!place) missingFields.push("Place");
    if (!pin_zipcode) missingFields.push("Pin/Zip Code");
    if (!city_dist) missingFields.push("City/District");
    if (!country_code) missingFields.push("Country Code");
    if (!state_code) missingFields.push("State Code");
    if (!division_type_code) missingFields.push("Division Type Code");
    if (!division_code) missingFields.push("Division Code");

    if (missingFields.length > 0) {
        return res.status(400).json({
            error: `Missing required fields: ${missingFields.join(", ")}`,
        });
    }

    try {
        console.log('Updating data for headquarters_code:', headquarters_code);

        // Check if the headquarters_code exists
        const headquarters = await prisma.headquarters_dtl.findFirst({
            where: { headquarters_code }
        });

        if (!headquarters) {
            console.error(`Headquarters with code ${headquarters_code} not found`);
            return res.status(404).json({ error: `Headquarters with code ${headquarters_code} not found` });
        }

        // Check if province_code is present in province_mst
        if (province_code) {
            const province = await prisma.province_mst.findFirst({
                where: { province_code }
            });

            if (!province) {
                console.error(`Province code ${province_code} not found`);
                return res.status(404).json({ error: `Province code ${province_code} not found` });
            }
        }

        // Check if division_type_code is present in quickcode_mst
        if (division_type_code) {
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
        }

        // Check if division_code is present in division_setup_mst
        if (division_code) {
            const division = await prisma.division_setup_mst.findFirst({
                where: {
                    division_code
                }
            });

            if (!division) {
                console.error(`Division code ${division_code} not found`);
                return res.status(404).json({ error: `Division code ${division_code} not found` });
            }
        }

        const existingHeadquarters = await prisma.headquarters_dtl.findFirst({
            where: {
                province_code,
                division_type_code,
                division_code,
                headquarters_name: {
                    equals: headquarters_name,
                    mode: 'insensitive', // Ensures case-insensitive comparison
                },
                headquarters_code: {
                    not: headquarters_code, // Exclude the current record from duplicate checks
                },
            },
        });

        if (existingHeadquarters) {
            return res.status(409).json({
                error: `Headquarters name  already exists for the specified province, division type, and division`,
            });
        }

        // Update the headquarters_dtl entry
        const updatedHeadquarters = await prisma.headquarters_dtl.update({
            where: {
                headquarters_code_province_code_division_type_code_division_code: {
                    headquarters_code,
                    province_code : headquarters.province_code,
                    division_type_code : headquarters.division_type_code,
                    division_code : headquarters.division_code
                }
            },
            data: {
                province_code,
                division_type_code,
                division_code,
                headquarters_name,
                address1,
                address2,
                place: place ? place.trim().toUpperCase() : null,
                city_dist,
                pin_zipcode,
                country_code,
                state_code,
                courier_address1,
                courier_address2,
                courier_place:courier_place ? courier_place.trim().toUpperCase() : null,
                courier_city_dist,
                courier_pin_zipcode,
                courier_country_code,
                courier_state_code,
                other_address1,
                other_address2,
                other_place :other_place ? other_place.trim().toUpperCase() : null,
                other_city_dist,
                other_pin_zipcode,
                other_country_code,
                other_state_code,
                phone1_isd,
                phone1_no: phone1_no ? BigInt(phone1_no) : null,
                phone2_isd,
                phone2_no: phone2_no ? BigInt(phone2_no) : null,
                phone3_isd,
                phone3_no: phone3_no ? BigInt(phone3_no) : null,
                mobile1_isd,
                mobile1_no: mobile1_no ? BigInt(mobile1_no) : null,
                mobile2_isd,
                mobile2_no: mobile2_no ? BigInt(mobile2_no) : null,
                mobile3_isd,
                mobile3_no: mobile3_no ? BigInt(mobile3_no) : null,
                watsup_isd,
                watsup_no: watsup_no ? BigInt(watsup_no) : null,
                fax_isd,
                fax_no: fax_no ? BigInt(fax_no) : null,
                office_mailid1,
                office_mailid2,
                office_mailid3,
                website1,
                website2,
                website3,
                secretary_isd,
                secretary_contact_no: secretary_contact_no ? BigInt(secretary_contact_no) : null,
                secretary_mailid,
                bursar_isd,
                bursar_contact_no: bursar_contact_no ? BigInt(bursar_contact_no) : null,
                bursar_mailid,
                language_code,
                concurrency_val,
                updated_by,
                updated_date
            }
        });

        // Convert BigInt fields to string before returning
        const updatedHeadquartersToReturn = {
            ...updatedHeadquarters,
            phone1_no: updatedHeadquarters.phone1_no?.toString(),
            phone2_no: updatedHeadquarters.phone2_no ? updatedHeadquarters.phone2_no.toString() : null,
            phone3_no: updatedHeadquarters.phone3_no ? updatedHeadquarters.phone3_no.toString() : null,
            mobile1_no: updatedHeadquarters.mobile1_no ? updatedHeadquarters.mobile1_no.toString() : null,
            mobile2_no: updatedHeadquarters.mobile2_no ? updatedHeadquarters.mobile2_no.toString() : null,
            mobile3_no: updatedHeadquarters.mobile3_no ? updatedHeadquarters.mobile3_no.toString() : null,
            watsup_no: updatedHeadquarters.watsup_no ? updatedHeadquarters.watsup_no.toString() : null,
            fax_no: updatedHeadquarters.fax_no ? updatedHeadquarters.fax_no.toString() : null,
            secretary_contact_no: updatedHeadquarters.secretary_contact_no ? updatedHeadquarters.secretary_contact_no.toString() : null,
            bursar_contact_no: updatedHeadquarters.bursar_contact_no ? updatedHeadquarters.bursar_contact_no.toString() : null
        };

        console.log('Data updated successfully:', updatedHeadquartersToReturn);
        return res.status(200).json({ message: 'Data updated successfully', data: updatedHeadquartersToReturn });
    } catch (error) {
        console.error('Error updating data:', error); // Log the full error object
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


export const getHeadquartersDetails = async (req, res) => {
    try {
        const { provinceCodes } = await resolveDataScope(req, prisma, req.query.province_code || null);
        const scopeSql = provinceCodes === null
            ? Prisma.empty
            : Prisma.sql`WHERE h.province_code IN (${Prisma.join(provinceCodes)})`;
        const headquartersDetails = await prisma.$queryRaw`
            SELECT 
                h.headquarters_code,
                h.province_code,
                p.province_name,
                h.division_type_code,
                h.headquarters_name,
                q.quickcode_name AS division_type_name,
                h.division_code,
                d.division_name,
                h.address1,
                h.address2,
                h.place,
                h.city_dist,
                h.pin_zipcode,
                h.country_code,
                h.state_code,
                h.courier_address1,
                h.courier_address2,
                h.courier_place,
                h.courier_city_dist,
                h.courier_pin_zipcode,
                h.courier_country_code,
                h.courier_state_code,
                h.other_address1,
                h.other_address2,
                h.other_place,
                h.other_city_dist,
                h.other_pin_zipcode,
                h.other_country_code,
                h.other_state_code,
                h.phone1_isd,
                h.phone1_no,
                h.phone2_isd,
                h.phone2_no,
                h.phone3_isd,
                h.phone3_no,
                h.mobile1_isd,
                h.mobile1_no,
                h.mobile2_isd,
                h.mobile2_no,
                h.mobile3_isd,
                h.mobile3_no,
                h.watsup_isd,
                h.watsup_no,
                h.fax_isd,
                h.fax_no,
                h.office_mailid1,
                h.office_mailid2,
                h.office_mailid3,
                h.website1,
                h.website2,
                h.website3,
                h.secretary_isd,
                h.secretary_contact_no,
                h.secretary_mailid,
                h.bursar_isd,
                h.bursar_contact_no,
                h.bursar_mailid,
                h.language_code,
                h.concurrency_val,
                h.created_by,
                h.created_date,
                h.updated_by,
                h.updated_date
            FROM 
                headquarters_dtl h
            LEFT JOIN 
                province_mst p ON h.province_code = p.province_code
            LEFT JOIN 
                quickcode_mst q ON h.division_type_code = q.quick_code
                AND q.quick_code_type = 'divtyp'
            LEFT JOIN
                division_setup_mst d ON h.division_code = d.division_code
                AND h.province_code = d.province_code
                AND h.division_type_code = d.division_type_code
            ${scopeSql}
        `;

        // Map the BigInt fields to strings
        const detailedHeadquarters = headquartersDetails.map((hq) => ({
            ...hq,
            phone1_no: hq.phone1_no?.toString(),
            phone2_no: hq.phone2_no ? hq.phone2_no.toString() : null,
            phone3_no: hq.phone3_no ? hq.phone3_no.toString() : null,
            mobile1_no: hq.mobile1_no ? hq.mobile1_no.toString() : null,
            mobile2_no: hq.mobile2_no ? hq.mobile2_no.toString() : null,
            mobile3_no: hq.mobile3_no ? hq.mobile3_no.toString() : null,
            watsup_no: hq.watsup_no ? hq.watsup_no.toString() : null,
            fax_no: hq.fax_no ? hq.fax_no.toString() : null,
            secretary_contact_no: hq.secretary_contact_no
                ? hq.secretary_contact_no.toString()
                : null,
            bursar_contact_no: hq.bursar_contact_no
                ? hq.bursar_contact_no.toString()
                : null,
        }));

        return res.status(200).json({
            message: 'Headquarters details retrieved successfully',
            data: detailedHeadquarters,
        });
    } catch (error) {
        console.error('Error fetching headquarters details:', error);
        return sendScopeError(res, error, 'Internal Server Error');
    }
};


export const getHeadquartersDetailsByCode = async (req, res) => {
    const { headquarters_code } = req.params;

    try {
        const headquartersDetail = await prisma.$queryRaw`
            SELECT 
                h.headquarters_code,
                h.province_code,
                p.province_name,
                h.division_type_code,
                q.quickcode_name AS division_type_name,
                h.division_code,
                h.address1,
                h.address2,
                h.place,
                h.city_dist,
                h.pin_zipcode,
                h.country_code,
                h.state_code,
                h.courier_address1,
                h.courier_address2,
                h.courier_place,
                h.courier_city_dist,
                h.courier_pin_zipcode,
                h.courier_country_code,
                h.courier_state_code,
                h.other_address1,
                h.other_address2,
                h.other_place,
                h.other_city_dist,
                h.other_pin_zipcode,
                h.other_country_code,
                h.other_state_code,
                h.phone1_isd,
                h.phone1_no,
                h.phone2_isd,
                h.phone2_no,
                h.phone3_isd,
                h.phone3_no,
                h.mobile1_isd,
                h.mobile1_no,
                h.mobile2_isd,
                h.mobile2_no,
                h.mobile3_isd,
                h.mobile3_no,
                h.watsup_isd,
                h.watsup_no,
                h.fax_isd,
                h.fax_no,
                h.office_mailid1,
                h.office_mailid2,
                h.office_mailid3,
                h.website1,
                h.website2,
                h.website3,
                h.secretary_isd,
                h.secretary_contact_no,
                h.secretary_mailid,
                h.bursar_isd,
                h.bursar_contact_no,
                h.bursar_mailid,
                h.language_code,
                h.concurrency_val,
                h.created_by,
                h.created_date,
                h.updated_by,
                h.updated_date
            FROM 
                headquarters_dtl h
            LEFT JOIN 
                province_mst p ON h.province_code = p.province_code
            LEFT JOIN 
                quickcode_mst q ON h.division_type_code = q.quick_code
                AND q.quick_code_type = 'divtyp'
            WHERE 
                h.headquarters_code = ${headquarters_code}
        `;

        if (!headquartersDetail || headquartersDetail.length === 0) {
            return res.status(404).json({ error: `No details found for headquarters_code ${headquarters_code}` });
        }

        // Convert BigInt fields to strings
        const detailedHeadquarters = {
            ...headquartersDetail[0],
            phone1_no: headquartersDetail[0].phone1_no?.toString(),
            phone2_no: headquartersDetail[0].phone2_no ? headquartersDetail[0].phone2_no.toString() : null,
            phone3_no: headquartersDetail[0].phone3_no ? headquartersDetail[0].phone3_no.toString() : null,
            mobile1_no: headquartersDetail[0].mobile1_no ? headquartersDetail[0].mobile1_no.toString() : null,
            mobile2_no: headquartersDetail[0].mobile2_no ? headquartersDetail[0].mobile2_no.toString() : null,
            mobile3_no: headquartersDetail[0].mobile3_no ? headquartersDetail[0].mobile3_no.toString() : null,
            watsup_no: headquartersDetail[0].watsup_no ? headquartersDetail[0].watsup_no.toString() : null,
            fax_no: headquartersDetail[0].fax_no ? headquartersDetail[0].fax_no.toString() : null,
            secretary_contact_no: headquartersDetail[0].secretary_contact_no
                ? headquartersDetail[0].secretary_contact_no.toString()
                : null,
            bursar_contact_no: headquartersDetail[0].bursar_contact_no
                ? headquartersDetail[0].bursar_contact_no.toString()
                : null,
        };

        return res.status(200).json({
            message: 'Headquarters details retrieved successfully',
            data: detailedHeadquarters,
        });
    } catch (error) {
        console.error(`Error fetching details for headquarters_code ${headquarters_code}:`, error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};



export const deleteHeadquartersDetails = async (req, res) => {
    const { headquarters_code } = req.params;
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

    // Fetch province_code based on province_name
    const province = await prisma.province_mst.findFirst({
        where: { province_name: provinceName },
        select: { province_code: true },
    });

    if (!province) {
        return res.status(404).json({ error: "Province not found for the given name" });
    }

    const province_code = province.province_code;
    try {
        console.log('Received data for deletion:', req.params);

        // First, find the existing headquarters details using only the headquarters_code
        const existingHeadquarters = await prisma.headquarters_dtl.findFirst({
            where: {
                headquarters_code,
                province_code
            },
            select: {
                headquarters_code: true,
                province_code: true,
                division_type_code: true,
                division_code: true,
            },
        });

        console.log('Existing Headquarters:', existingHeadquarters);

        if (!existingHeadquarters) {
            console.error(`Headquarters with code ${headquarters_code} not found`);
            return res.status(404).json({ error: `Headquarters with code ${headquarters_code} not found` });
        }

        // Now delete the headquarters detail using all composite key fields
        const result = await prisma.headquarters_dtl.delete({
            where: {
                headquarters_code_province_code_division_type_code_division_code: {
                    headquarters_code: existingHeadquarters.headquarters_code,
                    province_code: existingHeadquarters.province_code,
                    division_type_code: existingHeadquarters.division_type_code,
                    division_code: existingHeadquarters.division_code,
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

export const getDivisionNamesByProvinceAndType = async (req, res) => {
    let { province_code, division_type_code } = req.params;

    // Trim the input parameters to remove any extra whitespace or newline characters
    province_code = province_code.trim();
    division_type_code = division_type_code.trim();

    try {
        // Fetch division names and codes from division_setup_mst
        const divisions = await prisma.division_setup_mst.findMany({
            where: {
                province_code,
                division_type_code,
            },
            select: {
                division_name: true,
                division_code: true, // Include division_code
            },
        });

        if (divisions.length === 0) {
            return res.status(404).json({ message: 'No divisions found for the given province and division type.' });
        }

        // Combine the results
        const result = divisions.map(division => ({
            division_name: division.division_name,
            division_code: division.division_code, // Include division_code in the result
        }));

        console.log('Division data:', result);
        return res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching division names:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


export const getHeadquarters = async (req, res, next) => {
    const { headquarters_code } = req.params;
  
    const jsonifyBigInt = (data) => {
      return JSON.parse(
        JSON.stringify(data, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )
      );
    };
  
    try {
      if (!headquarters_code) {
        return res.status(400).json({ message: 'Headquarters code is required' });
      }
  
      // Retrieve headquarters details
      const headquarters = await prisma.headquarters_dtl.findFirst({
        where: { headquarters_code: headquarters_code },
      });
  
      if (!headquarters) {
        return res.status(404).json({ message: 'Headquarters not found' });
      }
  
      // Fetch province information
      const province = await prisma.province_mst.findFirst({
        where: { province_code: headquarters.province_code },
        select: { province_name: true },
      });
  
      // Fetch division type name from quickcode_mst
      const divisionTypeQuickcode = await prisma.quickcode_mst.findFirst({
        where: { quick_code: headquarters.division_type_code },
        select: { quickcode_name: true },
      });
  
      // Fetch division name
      const division = await prisma.division_setup_mst.findFirst({
        where: { division_code: headquarters.division_code ,  province_code:headquarters.province_code,
            division_type_code:headquarters.division_type_code,},
         
        select: { division_name: true },
      });
  
      // Fetch country and state names for headquarters address
      const country = headquarters.country_code
        ? await prisma.country_mst.findFirst({
            where: { country_code: headquarters.country_code },
            select: { country_name: true },
          })
        : null;
      const state = headquarters.state_code
        ? await prisma.state_mst.findFirst({
            where: { state_code: headquarters.state_code },
            select: { state_name: true },
          })
        : null;
  
      // Fetch country and state names for courier address
      const courierCountry = headquarters.courier_country_code
        ? await prisma.country_mst.findFirst({
            where: { country_code: headquarters.courier_country_code },
            select: { country_name: true },
          })
        : null;
      const courierState = headquarters.courier_state_code
        ? await prisma.state_mst.findFirst({
            where: { state_code: headquarters.courier_state_code },
            select: { state_name: true },
          })
        : null;
  
      // Fetch country and state names for other address
      const otherCountry = headquarters.other_country_code
        ? await prisma.country_mst.findFirst({
            where: { country_code: headquarters.other_country_code },
            select: { country_name: true },
          })
        : null;
      const otherState = headquarters.other_state_code
        ? await prisma.state_mst.findFirst({
            where: { state_code: headquarters.other_state_code },
            select: { state_name: true },
          })
        : null;
  
      // Combine address fields
      const combinedAddress = `${headquarters.address1 || ''} ${headquarters.address2 || ''} ${headquarters.place || ''}`.trim();
      const combinedCourierAddress = `${headquarters.courier_address1 || ''} ${headquarters.courier_address2 || ''} ${headquarters.courier_place || ''}`.trim();
      const combinedOtherAddress = `${headquarters.other_address1 || ''} ${headquarters.other_address2 || ''} ${headquarters.other_place || ''}`.trim();
  
      // Prepare JSON response
      const jsonResponse = {
        ...jsonifyBigInt(headquarters), // Convert headquarters details with BigInt handling
        province_name: province ? province.province_name : null,
        division_type_name: divisionTypeQuickcode ? divisionTypeQuickcode.quickcode_name : null,
        division_name: division ? division.division_name : null,
        country_name: country ? country.country_name : null,
        state_name: state ? state.state_name : null,
        courier_country_name: courierCountry ? courierCountry.country_name : null,
        courier_state_name: courierState ? courierState.state_name : null,
        other_country_name: otherCountry ? otherCountry.country_name : null,
        other_state_name: otherState ? otherState.state_name : null,
        address: combinedAddress,
        courier_address: combinedCourierAddress,
        other_address: combinedOtherAddress,
      };
  
      return res.status(200).json(jsonResponse);
    } catch (error) {
      console.error('Error fetching headquarters details by headquarters_code:', error);
      return res.status(500).json({ error: 'An error occurred while fetching headquarters details.' });
    } finally {
      await prisma.$disconnect();
    }
  };


  export const getHeadquartersExportAll = async (req, res) => {
    try {
        const { provinceCodes } = await resolveDataScope(req, prisma, req.query.province_code || null);
        const scopeSql = provinceCodes === null
            ? Prisma.empty
            : Prisma.sql`WHERE h.province_code IN (${Prisma.join(provinceCodes)})`;
        const headquartersDetails = await prisma.$queryRaw`
            SELECT 
                h.headquarters_code,               
                p.province_name,              
                h.headquarters_name,
                q.quickcode_name AS division_type_name,                
                d.division_name,
                h.address1,
                h.address2,
                h.place,
                h.city_dist,
                h.pin_zipcode,
                h.country_code,
                h.state_code,
                h.courier_address1,
                h.courier_address2,
                h.courier_place,
                h.courier_city_dist,
                h.courier_pin_zipcode,
                h.courier_country_code,
                h.courier_state_code,
                h.other_address1,
                h.other_address2,
                h.other_place,
                h.other_city_dist,
                h.other_pin_zipcode,
                h.other_country_code,
                h.other_state_code,
                h.phone1_isd,
                h.phone1_no,
                h.phone2_isd,
                h.phone2_no,
                h.phone3_isd,
                h.phone3_no,
                h.mobile1_isd,
                h.mobile1_no,
                h.mobile2_isd,
                h.mobile2_no,
                h.mobile3_isd,
                h.mobile3_no,
                h.watsup_isd,
                h.watsup_no,
                h.fax_isd,
                h.fax_no,
                h.office_mailid1,
                h.office_mailid2,
                h.office_mailid3,
                h.website1,
                h.website2,
                h.website3,
                h.secretary_isd,
                h.secretary_contact_no,
                h.secretary_mailid,
                h.bursar_isd,
                h.bursar_contact_no,
                h.bursar_mailid,
                h.language_code,
                h.concurrency_val,
                h.created_by,
                h.created_date,
                h.updated_by,
                h.updated_date
            FROM 
                headquarters_dtl h
            LEFT JOIN 
                province_mst p ON h.province_code = p.province_code
            LEFT JOIN 
                quickcode_mst q ON h.division_type_code = q.quick_code
                AND q.quick_code_type = 'divtyp'
            LEFT JOIN
                division_setup_mst d ON h.division_code = d.division_code
                AND h.province_code = d.province_code
                AND h.division_type_code = d.division_type_code
            ${scopeSql}
        `;

        // Map the BigInt fields to strings
        const detailedHeadquarters = headquartersDetails.map((hq) => ({
            ...hq,
            phone1_no: hq.phone1_no?.toString(),
            phone2_no: hq.phone2_no ? hq.phone2_no.toString() : null,
            phone3_no: hq.phone3_no ? hq.phone3_no.toString() : null,
            mobile1_no: hq.mobile1_no ? hq.mobile1_no.toString() : null,
            mobile2_no: hq.mobile2_no ? hq.mobile2_no.toString() : null,
            mobile3_no: hq.mobile3_no ? hq.mobile3_no.toString() : null,
            watsup_no: hq.watsup_no ? hq.watsup_no.toString() : null,
            fax_no: hq.fax_no ? hq.fax_no.toString() : null,
            secretary_contact_no: hq.secretary_contact_no
                ? hq.secretary_contact_no.toString()
                : null,
            bursar_contact_no: hq.bursar_contact_no
                ? hq.bursar_contact_no.toString()
                : null,
        }));

        return res.status(200).json({
            message: 'Headquarters details retrieved successfully',
            data: detailedHeadquarters,
        });
    } catch (error) {
        console.error('Error fetching headquarters details:', error);
        return sendScopeError(res, error, 'Internal Server Error');
    }
};

export const getDivisionNamesByCodes = async (req, res) => {
    try {
      const { division_type_code } = req.query;
  
      if (!division_type_code) {
        return res.status(400).json({ error: 'division_type_code query param is required' });
      }
  
      const codesArray = division_type_code.split(',').map(code => code.trim());
      console.log('Parsed division codes:', codesArray);
  
      const divisions = await prisma.division_setup_mst.findMany({
        where: {
            division_type_code: {
            in: codesArray,
            mode: 'insensitive'  // Ensure case-insensitive matching
          }
        },
        select: {
            division_code: true,
            division_name: true,
          province_code: true
        }
      });
  
      return res.json(divisions);
    } catch (error) {
      console.error('Error fetching division names by codes:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
  
  
  
 
