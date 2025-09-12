import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config/index.js";

// export const saveScholasticAdmisnPromonDetails = async (req, res) => {

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

//     // Extract `province_name` and `created_by` from the decoded token
//     const provinceName = decoded.province_name;
//     const createdBy = decoded.role_name || decoded.username || "Unknown";

//     // Fetch `province_code` based on `province_name`
//     const province = await prisma.province_mst.findFirst({
//       where: { province_name: provinceName },
//       select: { province_code: true },
//     });

//     if (!province) {
//       return res.status(404).json({ error: "Province not found for the given name" });
//     }

//     const province_code = province.province_code;

//     const {
//         scholastic_code,
//         centre_code,
//         centre_place,
//         division_type_code,
//         division_code,
//         formation_type_code,
//         scholastic_type_code,
//         promotion_to_code,
//         promotion_date, 
//         year_formation_code,
//         remarks,
//         start_date
//     } = req.body;
//     console.log('Body', req.body)

//     const created_date = new Date();  // Automatically generate the current date
//     const language_code = 'en';       // Default value
//     const concurrency_val = 1;        // Default value



//     // Date parsing function
//     const parseDate = (dateStr) => {
//         const parts = dateStr.split('.');
//         if (parts.length === 3) {
//             return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
//         }
//         return new Date(dateStr);
//     };

//     try {

//         // Step 1: Parse and validate the promotion_date
//         const parsedPromotionDate = promotion_date ? parseDate(promotion_date) : null;
//         if (parsedPromotionDate && isNaN(parsedPromotionDate.getTime())) {
//             return res.status(400).json({ error: 'Invalid promotion_date format.' });
//         }

//         const parsedstartDate = start_date ? parseDate(start_date) : null;
//         if(parsedstartDate && isNaN(parsedstartDate.getTime())) {
//             return res.status(400).json({ error : 'Invalid start date format'})
//         }

//         // Step 2: Auto-generate scholastics_admisn_code
//         const lastScholasticsAdmisn = await prisma.scholastics_admisn_promon_dtl.findFirst({
//             orderBy: {
//                 scholastics_admisn_code: 'desc'
//             }
//         });

//         console.log('last', lastScholasticsAdmisn)

//         let newScholasticsAdmisnCode = 'SCA001';
//         if (lastScholasticsAdmisn) {
//             const lastCodeNumber = parseInt(lastScholasticsAdmisn.scholastics_admisn_code.replace('SCA', ''), 10);
//             newScholasticsAdmisnCode = `SCA${(lastCodeNumber + 1).toString().padStart(3, '0')}`;
//         }

//         // Step 3: Check if province_code is present in province_mst
//         const province = await prisma.province_mst.findFirst({
//             where: { province_code }
//         });

//         if (!province) {
//             console.error(`Province code ${province_code} not found`);
//             return res.status(404).json({ error: `Province code ${province_code} not found` });
//         }

//         //check if scholastic_code is present in scholastic_dtl
//         const scholastic = await prisma.scholastics_dtl.findFirst({
//             where: { scholastic_code }
//         });

//         if (!scholastic) {
//             console.error(`Scholastic code ${scholastic_code} not found`);
//             return res.status(404).json({ error: `Scholastic code ${scholastic_code} not found` });
//         }

//         // Step 4: Check if division_type_code is present in quickcode_mst
//         const divisionType = await prisma.quickcode_mst.findUnique({
//             where: {
//                 quick_code_type_quick_code: {
//                     quick_code_type: 'divtyp',
//                     quick_code: division_type_code
//                 }
//             }
//         });

//         if (!divisionType) {
//             console.error(`Division type code ${division_type_code} not found`);
//             return res.status(404).json({ error: `Division type code ${division_type_code} not found` });
//         }

//         // Step 5: Check if division_code is present in division_setup_mst
//         const division = await prisma.division_setup_mst.findFirst({
//             where: { division_code }
//         });

//         if (!division) {
//             console.error(`Division code ${division_code} not found`);
//             return res.status(404).json({ error: `Division code ${division_code} not found` });
//         }

//         // Step 6: Check if centre_code is present in centre_dtl
//         const centre = await prisma.centre_dtl.findFirst({
//             where: { centre_code }
//         });

//         if (!centre) {
//             console.error(`Centre code ${centre_code} not found`);
//             return res.status(404).json({ error: `Centre code ${centre_code} not found` });
//         }

//         // Step 7: Check if formation_type_code is present in quickcode_mst (fortyp)
//         if (formation_type_code) {
//             const formationType = await prisma.quickcode_mst.findUnique({
//                 where: {
//                     quick_code_type_quick_code: {
//                         quick_code_type: 'fortyp',
//                         quick_code: formation_type_code
//                     }
//                 }
//             });

//             if (!formationType) {
//                 console.error(`Formation type code ${formation_type_code} not found`);
//                 return res.status(404).json({ error: `Formation type code ${formation_type_code} not found` });
//             }
//         }

//         // Step 8: Check if scholastic_type_code is present in quickcode_mst (schtyp)
//         if (scholastic_type_code) {
//             const scholasticType = await prisma.quickcode_mst.findUnique({
//                 where: {
//                     quick_code_type_quick_code: {
//                         quick_code_type: 'schtyp',
//                         quick_code: scholastic_type_code
//                     }
//                 }
//             });

//             if (!scholasticType) {
//                 console.error(`Scholastic type code ${scholastic_type_code} not found`);
//                 return res.status(404).json({ error: `Scholastic type code ${scholastic_type_code} not found` });
//             }
//         }

//         // Step 9: Check if promotion_to_code is present in quickcode_mst (promto)
//         if (promotion_to_code) {
//             const promotionTo = await prisma.quickcode_mst.findUnique({
//                 where: {
//                     quick_code_type_quick_code: {
//                         quick_code_type: 'promto',
//                         quick_code: promotion_to_code
//                     }
//                 }
//             });

//             if (!promotionTo) {
//                 console.error(`Promotion to code ${promotion_to_code} not found`);
//                 return res.status(404).json({ error: `Promotion to code ${promotion_to_code} not found` });
//             }
//         }

//         // Step 10: Check if year_formation_code is present in quickcode_mst (yrform)
//         if (year_formation_code) {
//             const yearFormation = await prisma.quickcode_mst.findUnique({
//                 where: {
//                     quick_code_type_quick_code: {
//                         quick_code_type: 'yrform',
//                         quick_code: year_formation_code
//                     }
//                 }
//             });

//             if (!yearFormation) {
//                 console.error(`Year formation code ${year_formation_code} not found`);
//                 return res.status(404).json({ error: `Year formation code ${year_formation_code} not found` });
//             }
//         }

//         const provinceCountryMap = await prisma.province_country_map_mst.findFirst({
//             where: { province_code },
//             select: { academic_year: true },
//         });

//         if (!provinceCountryMap || !provinceCountryMap.academic_year) {
//             return res
//                 .status(404)
//                 .json({ error: `Academic year not found for province code ${province_code}` });
//         }

//         const academic_year = provinceCountryMap.academic_year;

//         const lastSeq = await prisma.scholastics_admisn_promon_dtl.findFirst({
//             where: { scholastic_code },
//             orderBy: { seq_no: 'desc' },
//           });

//           console.log('Last Sequence Record:', lastSeq);

//           // Safely calculate `seq_no`
//           let seq_no = 1; // Default for new scholastic_code
//           if (lastSeq) {
//             // Increment seq_no based on the last sequence number
//             seq_no = lastSeq.seq_no + 1;

//             if (parsedstartDate) {
//                 // Update end_date of previous record
//                 const newEndDate = new Date(parsedstartDate);
//                 newEndDate.setDate(newEndDate.getDate() - 1); // Previous record's end_date = new start_date - 1
//                 await prisma.scholastics_admisn_promon_dtl.update({
//                     where: {
//                         scholastics_admisn_code_scholastic_code_centre_code: {
//                             scholastics_admisn_code: lastSeq.scholastics_admisn_code,
//                             scholastic_code: lastSeq.scholastic_code,
//                             centre_code: lastSeq.centre_code,
//                         }
//                     },
//                     data: { end_date: newEndDate },
//                 });
//             }
//         }

//         // Step 12: Save the new record to scholastics_admisn_promon_dtl
//         const result = await prisma.scholastics_admisn_promon_dtl.create({
//             data: {
//                 scholastics_admisn_code: newScholasticsAdmisnCode,
//                 scholastic_code,
//                 seq_no,
//                 centre_place: centre_place.centrePlace,
//                 centre_code,
//                 province_code,
//                 division_type_code,
//                 division_code,
//                 formation_type_code,
//                 scholastic_type_code,
//                 promotion_to_code,
//                 promotion_date: parsedPromotionDate,
//                 start_date:parsedstartDate,
//                 end_date: null,
//                 year_formation_code,
//                 academic_year,
//                 remarks,
//                 language_code,
//                 concurrency_val,
//                 created_by:createdBy,
//                 created_date,
//             }
//         });

//         console.log('Data saved successfully:', result);
//         return res.status(201).json({ message: 'Data saved successfully', data: result });
//     } catch (error) {
//         console.error('Error saving data:', error.message);
//         return res.status(500).json({ error: 'Internal Server Error' });
//     }
// };


export const saveScholasticAdmisnPromonDetails = async (req, res) => {

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

    // Extract `province_code` and `created_by` from the decoded token
    const provinceCodeLoggedIn = decoded.province_code; // Assuming province_code is part of the token
    const createdBy = decoded.role_name || decoded.username || "Unknown";

    const {
        scholastic_code,
        centre_code,
        centre_place,
        division_type_code,
        division_code,
        formation_type_code,
        scholastic_type_code,
        promotion_to_code,
        promotion_date,
        year_formation_code,
        remarks,
        start_date,
        province_code  // Ensure that province_code is passed in the request body
    } = req.body;

    // Ensure province_code is in the request body
    if (!province_code) {
        return res.status(400).json({ error: 'province_code is required in the request body' });
    }

    const created_date = new Date();  // Automatically generate the current date
    const language_code = 'en';       // Default value
    const concurrency_val = 1;        // Default value

    // Date parsing function
    const parseDate = (dateStr) => {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        return new Date(dateStr);
    };

    try {
        // Step 1: Parse and validate the promotion_date
        const parsedPromotionDate = promotion_date ? parseDate(promotion_date) : null;
        if (parsedPromotionDate && isNaN(parsedPromotionDate.getTime())) {
            return res.status(400).json({ error: 'Invalid promotion_date format.' });
        }

        const parsedstartDate = start_date ? parseDate(start_date) : null;
        if (parsedstartDate && isNaN(parsedstartDate.getTime())) {
            return res.status(400).json({ error: 'Invalid start date format' });
        }

        // Step 2: Auto-generate scholastics_admisn_code
        const lastScholasticsAdmisn = await prisma.scholastics_admisn_promon_dtl.findFirst({
            orderBy: {
                scholastics_admisn_code: 'desc'
            }
        });

        let newScholasticsAdmisnCode = 'SCA001';
        if (lastScholasticsAdmisn) {
            const lastCodeNumber = parseInt(lastScholasticsAdmisn.scholastics_admisn_code.replace('SCA', ''), 10);
            newScholasticsAdmisnCode = `SCA${(lastCodeNumber + 1).toString().padStart(3, '0')}`;
        }

        // Step 3: Check if province_code is present in province_mst
        const province = await prisma.province_mst.findFirst({
            where: { province_code: provinceCodeLoggedIn }
        });

        if (!province) {
            return res.status(404).json({ error: `Province code ${provinceCodeLoggedIn} not found` });
        }

        // Define inter_province_transfer_chk based on the province_code comparison
        let interProvinceTransferChk = 0;  // Default to 0 (intra-province transfer)
        if (provinceCodeLoggedIn !== province_code) {
            interProvinceTransferChk = 1; // Set to 1 for inter-province transfer
        }

        // Step 4: Check if division_type_code is present in quickcode_mst
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

        // Step 5: Check if division_code is present in division_setup_mst
        const division = await prisma.division_setup_mst.findFirst({
            where: { division_code }
        });

        if (!division) {
            return res.status(404).json({ error: `Division code ${division_code} not found` });
        }

        // Step 6: Check if centre_code is present in centre_dtl
        const centre = await prisma.centre_dtl.findFirst({
            where: { centre_code }
        });

        if (!centre) {
            return res.status(404).json({ error: `Centre code ${centre_code} not found` });
        }

        // Step 7: Check if formation_type_code is present in quickcode_mst (fortyp)
        if (formation_type_code) {
            const formationType = await prisma.quickcode_mst.findUnique({
                where: {
                    quick_code_type_quick_code: {
                        quick_code_type: 'fortyp',
                        quick_code: formation_type_code
                    }
                }
            });

            if (!formationType) {
                return res.status(404).json({ error: `Formation type code ${formation_type_code} not found` });
            }
        }

        // Step 8: Check if scholastic_type_code is present in quickcode_mst (schtyp)
        if (scholastic_type_code) {
            const scholasticType = await prisma.quickcode_mst.findUnique({
                where: {
                    quick_code_type_quick_code: {
                        quick_code_type: 'schtyp',
                        quick_code: scholastic_type_code
                    }
                }
            });

            if (!scholasticType) {
                return res.status(404).json({ error: `Scholastic type code ${scholastic_type_code} not found` });
            }
        }

        // Step 9: Check if promotion_to_code is present in quickcode_mst (promto)
        if (promotion_to_code) {
            const promotionTo = await prisma.quickcode_mst.findUnique({
                where: {
                    quick_code_type_quick_code: {
                        quick_code_type: 'promto',
                        quick_code: promotion_to_code
                    }
                }
            });

            if (!promotionTo) {
                return res.status(404).json({ error: `Promotion to code ${promotion_to_code} not found` });
            }
        }

        // Step 10: Check if year_formation_code is present in quickcode_mst (yrform)
        if (year_formation_code) {
            const yearFormation = await prisma.quickcode_mst.findUnique({
                where: {
                    quick_code_type_quick_code: {
                        quick_code_type: 'yrform',
                        quick_code: year_formation_code
                    }
                }
            });

            if (!yearFormation) {
                return res.status(404).json({ error: `Year formation code ${year_formation_code} not found` });
            }
        }

        const provinceCountryMap = await prisma.province_country_map_mst.findFirst({
            where: { province_code },
            select: { academic_year: true },
        });

        if (!provinceCountryMap || !provinceCountryMap.academic_year) {
            return res
                .status(404)
                .json({ error: `Academic year not found for province code ${province_code}` });
        }

        const academic_year = provinceCountryMap.academic_year;

        const lastSeq = await prisma.scholastics_admisn_promon_dtl.findFirst({
            where: { scholastic_code },
            orderBy: { seq_no: 'desc' },
        });

        console.log('Last Sequence Record:', lastSeq);

        // Safely calculate `seq_no`
        let seq_no = 1; // Default for new scholastic_code
        if (lastSeq) {
            // Increment seq_no based on the last sequence number
            seq_no = lastSeq.seq_no + 1;

            if (parsedstartDate) {
                // Update end_date of previous record
                const newEndDate = new Date(parsedstartDate);
                newEndDate.setDate(newEndDate.getDate() - 1); // Previous record's end_date = new start_date - 1
                await prisma.scholastics_admisn_promon_dtl.update({
                    where: {
                        scholastics_admisn_code_scholastic_code_centre_code: {
                            scholastics_admisn_code: lastSeq.scholastics_admisn_code,
                            scholastic_code: lastSeq.scholastic_code,
                            centre_code: lastSeq.centre_code,
                        }
                    },
                    data: { end_date: newEndDate },
                });
            }
        }

        const lastPromotion = await prisma.scholastics_admisn_promon_dtl.findFirst({
            where: { scholastic_code },
            orderBy: { seq_no: 'desc' }
        });

        if (lastPromotion) {
            const newEndDate = new Date(parsedstartDate);
            newEndDate.setDate(newEndDate.getDate() - 1);
            // Move the last promotion to the history table
            // Generate a new historical sequence number for the history table (start from 0)
            let newScholasticsAdmisnHisSeqNo = 1;

            // Fetch the latest history record to get the last historical sequence number (if any)
            const lastHistoryRecord = await prisma.scholastics_admisn_his_dtl.findFirst({
                where: { scholastic_code },
                orderBy: { scholastic_his_seq_no: 'desc' }  // Order by highest historical sequence number
            });

            if (lastHistoryRecord) {
                // If a history record exists, increment the sequence number
                newScholasticsAdmisnHisSeqNo = lastHistoryRecord.scholastic_his_seq_no + 1;
            }


            await prisma.scholastics_admisn_his_dtl.create({
                data: {
                    scholastics_admisn_code: lastPromotion.scholastics_admisn_code,
                    scholastic_code: lastPromotion.scholastic_code,
                    seq_no: lastPromotion.seq_no,
                    scholastic_his_seq_no: newScholasticsAdmisnHisSeqNo, // New history sequence
                    centre_code: lastPromotion.centre_code,
                    centre_place: lastPromotion.centre_place,
                    province_code: lastPromotion.province_code,
                    division_type_code: lastPromotion.division_type_code,
                    division_code: lastPromotion.division_code,
                    formation_type_code: lastPromotion.formation_type_code,
                    scholastic_type_code: lastPromotion.scholastic_type_code,
                    promotion_to_code: lastPromotion.promotion_to_code,
                    promotion_date: lastPromotion.promotion_date,
                    start_date: lastPromotion.start_date,
                    end_date: newEndDate, // Set end date for the historical record
                    year_formation_code: lastPromotion.year_formation_code,
                    academic_year: lastPromotion.academic_year,
                    remarks: lastPromotion.remarks,
                    language_code: lastPromotion.language_code,
                    concurrency_val: lastPromotion.concurrency_val,
                    created_by: createdBy,
                    created_date: new Date(),
                    inter_province_transfer_chk: lastPromotion.inter_province_transfer_chk,
                    mode: lastPromotion.mode
                }
            });

            // Delete the last promotion record
            await prisma.scholastics_admisn_promon_dtl.delete({
                where: {
                    scholastics_admisn_code_scholastic_code_centre_code: {
                        scholastics_admisn_code: lastPromotion.scholastics_admisn_code,
                        scholastic_code: lastPromotion.scholastic_code,
                        centre_code: lastPromotion.centre_code
                    }
                }
            });
        }


        // Step 12: Save the new record to scholastics_admisn_promon_dtl
        const result = await prisma.scholastics_admisn_promon_dtl.create({
            data: {
                scholastics_admisn_code: newScholasticsAdmisnCode,
                scholastic_code,
                seq_no, // Default value, adjust logic if necessary
                centre_place: centre_place.centrePlace,
                centre_code,
                province_code,  // Save the province code from request body
                division_type_code,
                division_code,
                formation_type_code,
                scholastic_type_code,
                promotion_to_code,
                promotion_date: parsedPromotionDate,
                start_date: parsedstartDate,
                end_date: null,
                year_formation_code,
                academic_year, // Placeholder, adjust accordingly
                remarks,
                language_code,
                concurrency_val,
                created_by: createdBy,
                created_date,
                inter_province_transfer_chk: interProvinceTransferChk, // Ensure inter_province_transfer_chk is included
            }
        });

        console.log('Data saved successfully:', result);
        return res.status(201).json({ message: 'Data saved successfully', data: result });
    } catch (error) {
        console.error('Error saving data:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};





// export const getScholasticsAdmisnPromonDetails = async (req, res) => {
//     try {

//         const authHeader = req.headers.authorization;
//         if (!authHeader || !authHeader.startsWith("Bearer ")) {
//             return res.status(401).json({ error: "Access token is missing or invalid" });
//         }

//         const token = authHeader.split(" ")[1];
//         let decoded;

//         try {
//             decoded = jwt.verify(token, process.env.JWT_SECRET);
//         } catch (error) {
//             if (error.name === "TokenExpiredError") {
//                 return res.status(401).json({ error: "Token has expired" });
//             }
//             if (error.name === "JsonWebTokenError") {
//                 return res.status(401).json({ error: "Invalid token" });
//             }
//             return res.status(500).json({ error: "Failed to verify token" });
//         }

//         // Extract `province_name` and `created_by` from the decoded token
//         const provinceName = decoded.province_name;

//         // Fetch `province_code` based on `province_name`
//         const province = await prisma.province_mst.findFirst({
//             where: { province_name: provinceName },
//             select: { province_code: true },
//         });

//         if (!province) {
//             return res.status(404).json({ error: "Province not found for the given name" });
//         }

//         const province_code = province.province_code;
//         const scholasticsAdmisnPromonDetails = await prisma.$queryRaw`
//             SELECT 
//                 sap.scholastics_admisn_code,
//                 sap.scholastic_code,
//                 sd.first_name,  
//                 sd.middle_name,
//                 sd.last_name,
//                 sap.centre_code,
//                 sap.province_code,
//                 p.province_name,
//                 sap.division_type_code,
//                 q_divtyp.quickcode_name AS division_type_name,
//                 sap.division_code,
//                 sap.formation_type_code,
//                 q_fortyp.quickcode_name AS formation_type_name,
//                 sap.scholastic_type_code,
//                 q_schtyp.quickcode_name AS scholastic_type_name,
//                 sap.promotion_to_code,
//                 q_promto.quickcode_name AS promotion_to_name,
//                 sap.promotion_date,
//                 sap.year_formation_code,
//                 q_yrform.quickcode_name AS year_formation_name,
//                 sap.academic_year,
//                 sap.remarks,
//                 sap.language_code,
//                 sap.concurrency_val,
//                 sap.created_by,
//                 sap.created_date,
//                 sap.updated_by,
//                 sap.updated_date
//             FROM 
//                 scholastics_admisn_promon_dtl sap
//             LEFT JOIN 
//                 scholastics_dtl sd ON sap.scholastic_code = sd.scholastic_code  -- Join to get the scholastic name
//             LEFT JOIN 
//                 province_mst p ON sap.province_code = p.province_code
//             LEFT JOIN 
//                 quickcode_mst q_divtyp ON sap.division_type_code = q_divtyp.quick_code
//                 AND q_divtyp.quick_code_type = 'divtyp'
//             LEFT JOIN 
//                 quickcode_mst q_fortyp ON sap.formation_type_code = q_fortyp.quick_code
//                 AND q_fortyp.quick_code_type = 'fortyp'
//             LEFT JOIN 
//                 quickcode_mst q_schtyp ON sap.scholastic_type_code = q_schtyp.quick_code
//                 AND q_schtyp.quick_code_type = 'schtyp'
//             LEFT JOIN 
//                 quickcode_mst q_promto ON sap.promotion_to_code = q_promto.quick_code
//                 AND q_promto.quick_code_type = 'promto'
//             LEFT JOIN 
//                 quickcode_mst q_yrform ON sap.year_formation_code = q_yrform.quick_code
//                 AND q_yrform.quick_code_type = 'yrform'
//             WHERE 
//                 sap.province_code = ${province_code}
//         `;

//         return res.status(200).json({
//             message: 'Scholastics Admission Promotion details retrieved successfully',
//             data: scholasticsAdmisnPromonDetails,
//         });
//     } catch (error) {
//         console.error('Error fetching scholastics admission promotion details:', error);
//         return res.status(500).json({ error: 'Internal Server Error' });
//     }
// };



export const getScholasticsAdmisnPromonDetails = async (req, res) => {
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
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({ error: "Token has expired" });
            }
            if (error.name === "JsonWebTokenError") {
                return res.status(401).json({ error: "Invalid token" });
            }
            return res.status(500).json({ error: "Failed to verify token" });
        }

        const loginProvinceCode = decoded.province_code || decoded.province_name;
        const { transferType } = req.query;

        if (!transferType || !['0', '1'].includes(transferType)) {
            return res.status(400).json({ error: "Valid transfer type (0 for intra, 1 for inter) is required." });
        }

        let promotions = [];

        if (transferType === "0") {
            promotions = await prisma.scholastics_admisn_promon_dtl.findMany({
                where: {
                    province_code: loginProvinceCode,
                    inter_province_transfer_chk: { in: [0, 1] },
                    end_date: null
                },
            });
        } else {
            const allInter = await prisma.scholastics_admisn_promon_dtl.findMany({
                where: {
                    inter_province_transfer_chk: 1,
                    end_date: null
                },
            });

            const validInter = allInter.filter(item => item.province_code !== loginProvinceCode);

            if (validInter.length === 0) {
                return res.status(200).json({
                    message: "All inter-marked promotions belong to your own province. They are treated as intra.",
                    data: []
                });
            }

            promotions = validInter;
        }

        const formattedPromotions = await Promise.all(
            promotions.map(async (item) => {
                const scholastic = await prisma.scholastics_dtl.findFirst({
                    where: { scholastic_code: item.scholastic_code },
                    select: { first_name: true, middle_name: true, last_name: true }
                });

                const province = await prisma.province_mst.findFirst({
                    where: { province_code: item.province_code },
                    select: { province_name: true }
                });

                const divisionType = await prisma.quickcode_mst.findFirst({
                    where: { quick_code: item.division_type_code, quick_code_type: 'divtyp' },
                    select: { quickcode_name: true }
                });

                const formationType = await prisma.quickcode_mst.findFirst({
                    where: { quick_code: item.formation_type_code, quick_code_type: 'fortyp' },
                    select: { quickcode_name: true }
                });

                const scholasticType = await prisma.quickcode_mst.findFirst({
                    where: { quick_code: item.scholastic_type_code, quick_code_type: 'schtyp' },
                    select: { quickcode_name: true }
                });

                const promotionTo = await prisma.quickcode_mst.findFirst({
                    where: { quick_code: item.promotion_to_code, quick_code_type: 'promto' },
                    select: { quickcode_name: true }
                });

                const yearFormation = await prisma.quickcode_mst.findFirst({
                    where: { quick_code: item.year_formation_code, quick_code_type: 'yrform' },
                    select: { quickcode_name: true }
                });
                const divisionName = await prisma.division_setup_mst.findFirst({
  where: {
    province_code: item.province_code,
    division_type_code: item.division_type_code,
    division_code: item.division_code,
  },
  select: { division_name: true }
});


                return {
                    ...item,
                    scholastic_name: scholastic ? `${scholastic.first_name} ${scholastic.middle_name || ''} ${scholastic.last_name}`.trim() : 'N/A',
                    province_name: province?.province_name || 'N/A',
                    division_type_name: divisionType?.quickcode_name || 'N/A',
                     division_name: divisionName?.division_name || 'N/A', 
                    formation_type_name: formationType?.quickcode_name || 'N/A',
                    scholastic_type_name: scholasticType?.quickcode_name || 'N/A',
                    promotion_to_name: promotionTo?.quickcode_name || 'N/A',
                    year_formation_name: yearFormation?.quickcode_name || 'N/A'
                };
            })
        );

        return res.status(200).json({
            message:
                formattedPromotions.length === 0
                    ? (transferType === '0'
                        ? "No intra promotions found for your province"
                        : "No inter promotions found from other provinces")
                    : (transferType === '0'
                        ? "Intra promotions found (including wrongly marked inters)"
                        : "Inter promotions from other provinces found."),
            data: formattedPromotions
        });

    } catch (error) {
        console.error('Error fetching scholastics promotion details:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};



export const getScholasticsAdmisnPromonDetailsByCode = async (req, res) => {
    const { scholastics_admisn_code } = req.params;

    try {
        const scholasticsAdmisnPromonDetail = await prisma.$queryRaw`
            SELECT 
                sap.scholastics_admisn_code,
                sap.scholastic_code,
                sap.centre_code,
                sap.province_code,
                p.province_name,
                sap.division_type_code,
                q_divtyp.quickcode_name AS division_type_name,
                sap.division_code,
                sap.formation_type_code,
                q_fortyp.quickcode_name AS formation_type_name,
                sap.scholastic_type_code,
                q_schtyp.quickcode_name AS scholastic_type_name,
                sap.promotion_to_code,
                q_promto.quickcode_name AS promotion_to_name,
                sap.promotion_date,
                sap.year_formation_code,
                q_yrform.quickcode_name AS year_formation_name,
                sap.academic_year,
                sap.remarks,
                sap.language_code,
                sap.concurrency_val,
                sap.created_by,
                sap.created_date,
                sap.updated_by,
                sap.updated_date
            FROM 
                scholastics_admisn_promon_dtl sap
            LEFT JOIN 
                province_mst p ON sap.province_code = p.province_code
            LEFT JOIN 
                quickcode_mst q_divtyp ON sap.division_type_code = q_divtyp.quick_code
                AND q_divtyp.quick_code_type = 'divtyp'
            LEFT JOIN 
                quickcode_mst q_fortyp ON sap.formation_type_code = q_fortyp.quick_code
                AND q_fortyp.quick_code_type = 'fortyp'
            LEFT JOIN 
                quickcode_mst q_schtyp ON sap.scholastic_type_code = q_schtyp.quick_code
                AND q_schtyp.quick_code_type = 'schtyp'
            LEFT JOIN 
                quickcode_mst q_promto ON sap.promotion_to_code = q_promto.quick_code
                AND q_promto.quick_code_type = 'promto'
            LEFT JOIN 
                quickcode_mst q_yrform ON sap.year_formation_code = q_yrform.quick_code
                AND q_yrform.quick_code_type = 'yrform'
            WHERE 
                sap.scholastics_admisn_code = ${scholastics_admisn_code}
        `;

        if (!scholasticsAdmisnPromonDetail || scholasticsAdmisnPromonDetail.length === 0) {
            return res.status(404).json({ error: `No details found for scholastics_admisn_code ${scholastics_admisn_code}` });
        }

        return res.status(200).json({
            message: 'Scholastics Admission Promotion details retrieved successfully',
            data: scholasticsAdmisnPromonDetail[0], // Since we are expecting only one record
        });
    } catch (error) {
        console.error(`Error fetching details for scholastics_admisn_code ${scholastics_admisn_code}:`, error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


export const updateScholasticsAdmisnPromonDetails = async (req, res) => {
    const {
        centre_code,
        division_name,  // Assuming division_name is provided instead of division_code
        division_type_code,
        formation_type_code,
        scholastic_type_code,
        promotion_to_code,
        promotion_date,
        start_date,
        year_formation_code,
        remarks,
        province_code,   
        language_code = 'en',  // Default value
        concurrency_val = 1,    // Default value
        updated_by,    // Default value
    } = req.body;

    const { scholastics_admisn_code } = req.params;  // Extract scholastics_admisn_code from URL params
    const updated_date = new Date();                 // Automatically generate the current date

    // Function to parse dates in dd.mm.yyyy format
    const parseDate = (dateStr) => {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        return new Date(dateStr);
    };

   
    try {
        console.log('Updating data for scholastics_admisn_code:', scholastics_admisn_code);

        // Check if the scholastics_admisn_code exists
        const scholasticsAdmisn = await prisma.scholastics_admisn_promon_dtl.findFirst({
            where: { scholastics_admisn_code }
        });

        if (!scholasticsAdmisn) {
            console.error(`Scholastics admission with code ${scholastics_admisn_code} not found`);
            return res.status(404).json({ error: `Scholastics admission with code ${scholastics_admisn_code} not found` });
        }

        // Check if scholastic_code and province_code are valid
        const currentScholasticCode = scholasticsAdmisn.scholastic_code;
        const currentProvinceCode = scholasticsAdmisn.province_code;

        if (req.body.scholastic_code && req.body.scholastic_code !== currentScholasticCode) {
            return res.status(400).json({ error: `The provided scholastic_code does not match the current record.` });
        }

       

       let resolvedDivisionCode = req.body.division_code || null;

if (division_name && division_type_code) {
  const division = await prisma.division_setup_mst.findFirst({
    where: {
      division_name,
      division_type_code,
    },
    select: { division_code: true },
  });

  if (!division) {
    return res.status(404).json({
      error: `Division '${division_name}' with type '${division_type_code}' not found`,
    });
  }

  resolvedDivisionCode = division.division_code;
}


        // Continue with the other checks...
        if (centre_code) {
            const centre = await prisma.centre_dtl.findFirst({
                where: { centre_code }
            });

            if (!centre) {
                return res.status(404).json({ error: `Centre code ${centre_code} not found` });
            }
        }

        if (formation_type_code) {
            const formationType = await prisma.quickcode_mst.findUnique({
                where: {
                    quick_code_type_quick_code: {
                        quick_code_type: 'fortyp',
                        quick_code: formation_type_code
                    }
                }
            });

            if (!formationType) {
                return res.status(404).json({ error: `Formation type code ${formation_type_code} not found` });
            }
        }

        if (scholastic_type_code) {
            const scholasticType = await prisma.quickcode_mst.findUnique({
                where: {
                    quick_code_type_quick_code: {
                        quick_code_type: 'schtyp',
                        quick_code: scholastic_type_code
                    }
                }
            });

            if (!scholasticType) {
                return res.status(404).json({ error: `Scholastic type code ${scholastic_type_code} not found` });
            }
        }

        if (promotion_to_code) {
            const promotionTo = await prisma.quickcode_mst.findUnique({
                where: {
                    quick_code_type_quick_code: {
                        quick_code_type: 'promto',
                        quick_code: promotion_to_code
                    }
                }
            });

            if (!promotionTo) {
                return res.status(404).json({ error: `Promotion to code ${promotion_to_code} not found` });
            }
        }

        if (year_formation_code) {
            const yearFormation = await prisma.quickcode_mst.findUnique({
                where: {
                    quick_code_type_quick_code: {
                        quick_code_type: 'yrform',
                        quick_code: year_formation_code
                    }
                }
            });

            if (!yearFormation) {
                return res.status(404).json({ error: `Year formation code ${year_formation_code} not found` });
            }
        }

        const parsedPromotionDate = promotion_date ? parseDate(promotion_date) : null;
        if (parsedPromotionDate && isNaN(parsedPromotionDate.getTime())) {
            return res.status(400).json({ error: 'Invalid promotion_date format.' });
        }

        const parsedstartDate = start_date ? parseDate(start_date) : null;
        if (parsedstartDate && isNaN(parsedstartDate.getTime())) {
            return res.status(400).json({ error: 'Invalid start date format' })
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

        // Extract `province_name` and fetch corresponding `province_code`
        const provinceName = decoded.province_name;
        const UpdateBy = decoded.role_name || decoded.username || "Unknown";

        const province = await prisma.province_mst.findFirst({
            where: { province_name: provinceName },
            select: { province_code: true },
        });

        if (!province) {
            return res.status(404).json({ error: "Province not found for the given name" });
        }

        // const province_code = province.province_code;

        if (req.body.province_code && req.body.province_code !== currentProvinceCode) {
  return res.status(400).json({ error: `The provided province_code does not match the current record.` });
}


  let resolvedCentreCode = centre_code;
let resolvedCentrePlace = null;

// 🟢 1. Try to get centre_code + centre_place using centre_name + province_code
if (!resolvedCentreCode && req.body.centre_name) {
  const centre = await prisma.centre_dtl.findFirst({
    where: {
      centre_name: req.body.centre_name,
      province_code: province_code,
    },
    select: {
      centre_code: true,
      centre_place: true,
    },
  });

  if (!centre) {
    return res.status(404).json({
      error: `Centre name '${req.body.centre_name}' not found in the specified province.`,
    });
  }

  resolvedCentreCode = centre.centre_code;
  resolvedCentrePlace = centre.centre_place;
}

if (!resolvedCentrePlace && resolvedCentreCode) {
  const centre = await prisma.centre_dtl.findFirst({
    where: { centre_code: resolvedCentreCode },
    select: { centre_place: true },
  });

  if (centre) {
    resolvedCentrePlace = centre.centre_place;
  } else {
    return res.status(404).json({
      error: `Centre place could not be found for centre code '${resolvedCentreCode}'.`
    });
  }
}


// 🟡 2. If centre_name is not given, fallback to division_type + division_name
if (!resolvedCentrePlace && req.body.division_name && req.body.division_type_code) {
  // Step 1: Get division_code
  const division = await prisma.division_setup_mst.findFirst({
    where: {
      division_name: req.body.division_name,
      division_type_code: req.body.division_type_code,
    },
    select: {
      division_code: true,
    },
  });

  if (!division) {
    return res.status(404).json({
      error: `Division '${req.body.division_name}' with type '${req.body.division_type_code}' not found.`,
    });
  }

  // Step 2: Use division_code to find a centre_place
  const centre = await prisma.centre_dtl.findFirst({
    where: {
      division_code: division.division_code,
    },
    select: {
      centre_place: true,
    },
  });

  if (!centre) {
    return res.status(404).json({
      error: `No center found for division '${division.division_code}'.`,
    });
  }

  resolvedCentrePlace = centre.centre_place;
}




 




        // Update the entry with the retrieved division_code
        const updatedScholasticsAdmisn = await prisma.scholastics_admisn_promon_dtl.update({
            where: {
                scholastics_admisn_code_scholastic_code_centre_code: {
                    scholastics_admisn_code,
                    scholastic_code: scholasticsAdmisn.scholastic_code,
                    centre_code: scholasticsAdmisn.centre_code
                }
            },
            data: {
                province_code,
                centre_code: resolvedCentreCode,
                centre_place: resolvedCentrePlace,
                division_type_code,
                division_code: resolvedDivisionCode,  // Save the retrieved division_code
                formation_type_code,
                scholastic_type_code,
                promotion_to_code,
                province_code,
                promotion_date: parsedPromotionDate,
                start_date: parsedstartDate,
                year_formation_code,
                remarks,
                language_code,
                concurrency_val,
                updated_by: UpdateBy,
                updated_date
            }
        });

        return res.status(200).json({ message: 'Data updated successfully', data: updatedScholasticsAdmisn });
    } catch (error) {
        console.error('Error updating data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteScholasticsAdmisnPromonDetails = async (req, res) => {
    const { scholastics_admisn_code } = req.params;
    console.log(req.params);

    try {

        console.log('Received data for deletion:', req.params);

        // Find the existing scholastics admission promotion details
        const existingScholasticsAdmisnPromon = await prisma.scholastics_admisn_promon_dtl.findFirst({
            where: {
                scholastics_admisn_code,
            },
            select: {
                scholastics_admisn_code: true,
                scholastic_code: true,
                centre_code: true,
            },
        });

        console.log('Existing Scholastics Admission Promotion:', existingScholasticsAdmisnPromon);

        if (!existingScholasticsAdmisnPromon) {
            console.error(`Scholastics admission promotion with code ${scholastics_admisn_code} not found`);
            return res.status(404).json({ error: `Scholastics admission promotion with code ${scholastics_admisn_code} not found` });
        }



        // Delete the scholastics admission promotion detail using the composite key
        const result = await prisma.scholastics_admisn_promon_dtl.delete({
            where: {
                scholastics_admisn_code_scholastic_code_centre_code: {
                    scholastics_admisn_code: existingScholasticsAdmisnPromon.scholastics_admisn_code,
                    scholastic_code: existingScholasticsAdmisnPromon.scholastic_code,
                    centre_code: existingScholasticsAdmisnPromon.centre_code,
                },
            },
        });

        console.log('Data deleted successfully:', result);
        return res.status(200).json({ message: 'Data deleted successfully', data: result });
    } catch (error) {
        console.error('Error deleting data:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};



// export const deleteScholasticsAdmisnPromonDetails = async (req, res) => {
//     const { scholastics_admisn_code } = req.params;

//     try {
//         console.log('Received data for deletion:', scholastics_admisn_code);

//         // Find the record to delete (regardless of end_date value)
//         const recordToDelete = await prisma.scholastics_admisn_promon_dtl.findFirst({
//             where: {
//                 scholastics_admisn_code,
//             },
//             select: {
//                 scholastics_admisn_code: true,
//                 scholastic_code: true,
//                 centre_code: true,
//                 seq_no: true,
//                 end_date: true,  // We will delete it regardless of its value
//             },
//         });

//         if (!recordToDelete) {
//             console.error(`No record found with scholastics_admisn_code ${scholastics_admisn_code}`);
//             return res.status(400).json({
//                 message: `No record found with scholastics_admisn_code ${scholastics_admisn_code}.`,
//             });
//         }

//         console.log('Record found for deletion:', recordToDelete);

//         // Find the previous record (with seq_no - 1) to update its end_date if applicable
//         const previousRecord = await prisma.scholastics_admisn_promon_dtl.findFirst({
//             where: {
//                 scholastics_admisn_code,
//                 seq_no: recordToDelete.seq_no - 1,
//             },
//             select: {
//                 scholastics_admisn_code: true,
//                 scholastic_code: true,
//                 centre_code: true,
//                 seq_no: true,
//                 end_date: true,
//             },
//         });

//         console.log('Previous record found:', previousRecord);

//         // Delete the record (without checking the end_date value)
//         await prisma.scholastics_admisn_promon_dtl.delete({
//             where: {
//                 scholastics_admisn_code_scholastic_code_centre_code: {
//                     scholastics_admisn_code: recordToDelete.scholastics_admisn_code,
//                     scholastic_code: recordToDelete.scholastic_code,
//                     centre_code: recordToDelete.centre_code,
//                 },
//             },
//         });

//         console.log('Record deleted successfully:', recordToDelete);

//         // If there's a previous record, update its end_date to NULL
//         if (previousRecord) {
//             console.log('Updating previous record to set end_date to NULL:', previousRecord);
//             await prisma.scholastics_admisn_promon_dtl.update({
//                 where: {
//                     scholastics_admisn_code_scholastic_code_centre_code: {
//                         scholastics_admisn_code: previousRecord.scholastics_admisn_code,
//                         scholastic_code: previousRecord.scholastic_code,
//                         centre_code: previousRecord.centre_code,
//                     },
//                 },
//                 data: {
//                     end_date: null,
//                 },
//             });
//         } else {
//             console.log('No previous record found to update end_date.');
//         }

//         return res.status(200).json({
//             message: 'Record deleted successfully and previous record updated (if applicable)',
//         });
//     } catch (error) {
//         console.error('Error during deletion process:', error.message);
//         return res.status(500).json({ error: 'Internal Server Error' });
//     }
// };



export const getAdmissionPromonDetails = async (req, res) => {
    const { scholastics_admisn_code } = req.params;

    try {
        // Query the scholastics_admisn_promon_dtl table
        const scholasticsAdmisnPromonDetail = await prisma.scholastics_admisn_promon_dtl.findFirst({
            where: {
                scholastics_admisn_code: scholastics_admisn_code,
            },
            select: {
                scholastics_admisn_code: true,
                scholastic_code: true,
                centre_code: true,
                province_code: true,
                division_type_code: true, // Need this for quickcode_mst
                division_code: true,
                formation_type_code: true,
                scholastic_type_code: true, // Need this for quickcode_mst
                promotion_to_code: true,
                year_formation_code: true,
                promotion_date: true,
                academic_year: true,
                remarks: true,
                language_code: true,
                concurrency_val: true,
                created_by: true,
                created_date: true,
                updated_by: true,
                updated_date: true,
                centre_place: true,
                start_date: true
            },
        });

        if (!scholasticsAdmisnPromonDetail) {
            return res.status(404).json({ error: `No details found for scholastics_admisn_code ${scholastics_admisn_code}` });
        }

        // Query the quickcode_mst table to get quickcode_name for scholastic_type_code
        const scholasticTypeDetails = await prisma.quickcode_mst.findFirst({
            where: {
                quick_code: scholasticsAdmisnPromonDetail.scholastic_type_code, // Match the scholastic_type_code from the previous query
                quick_code_type: 'schtyp', // Ensure quickcode_type is 'schtyp'
            },
            select: {
                quickcode_name: true, // Fetch the quickcode_name
            },
        });

        if (!scholasticTypeDetails) {
            return res.status(404).json({ error: `No quickcode details found for scholastic_type_code ${scholasticsAdmisnPromonDetail.scholastic_type_code}` });
        }

        // Query the province_mst table to get province_name
        const provinceDetails = await prisma.province_mst.findFirst({
            where: {
                province_code: scholasticsAdmisnPromonDetail.province_code,
            },
            select: {
                province_name: true,
            },
        });

        if (!provinceDetails) {
            return res.status(404).json({ error: `No province details found for province_code ${scholasticsAdmisnPromonDetail.province_code}` });
        }

        // Query the quickcode_mst table to get quickcode_name for division_type_code (quick_code_type: 'divtyp')
        const divisionTypeDetails = await prisma.quickcode_mst.findFirst({
            where: {
                quick_code: scholasticsAdmisnPromonDetail.division_type_code, // Match the division_type_code from the previous query
                quick_code_type: 'divtyp', // Ensure quickcode_type is 'divtyp'
            },
            select: {
                quickcode_name: true, // Fetch the quickcode_name for division_type
            },
        });

        if (!divisionTypeDetails) {
            return res.status(404).json({ error: `No quickcode details found for division_type_code ${scholasticsAdmisnPromonDetail.division_type_code}` });
        }

        // Query the division_setup_mst table to get division_name based on division_code
        const divisionDetails = await prisma.division_setup_mst.findFirst({
            where: {
                province_code: scholasticsAdmisnPromonDetail.province_code,
                division_type_code: scholasticsAdmisnPromonDetail.division_type_code,
                division_code: scholasticsAdmisnPromonDetail.division_code, // Assuming division_type_code maps to division_code
            },
            select: {
                division_name: true, // Fetch the division_name
            },
        });

        if (!divisionDetails) {
            return res.status(404).json({ error: `No division details found for division_code ${scholasticsAdmisnPromonDetail.division_type_code}` });
        }

        const centreDetails = await prisma.centre_dtl.findFirst({
            where: {
                centre_code: scholasticsAdmisnPromonDetail.centre_code,
            },
            select: {
                centre_name: true,
            },
        });


        const formationTypeDetails = await prisma.quickcode_mst.findFirst({
            where: {
                quick_code: scholasticsAdmisnPromonDetail.formation_type_code,
                quick_code_type: 'fortyp', // Ensure quickcode_type is 'formtyp'
            },
            select: {
                quickcode_name: true,
            },
        });

        if (!formationTypeDetails) {
            return res.status(404).json({ error: `No quickcode details found for formation_type_code ${scholasticsAdmisnPromonDetail.formation_type_code}` });
        }

        const promotionToDetails = await prisma.quickcode_mst.findFirst({
            where: {
                quick_code: scholasticsAdmisnPromonDetail.promotion_to_code,
                quick_code_type: 'promto', // Ensure quickcode_type is 'promtyp'
            },
            select: {
                quickcode_name: true,
            },
        });

        if (!promotionToDetails) {
            return res.status(404).json({ error: `No quickcode details found for promotion_to_code ${scholasticsAdmisnPromonDetail.promotion_to_code}` });
        }

        const yearFormationDetails = await prisma.quickcode_mst.findFirst({
            where: {
                quick_code: scholasticsAdmisnPromonDetail.year_formation_code,
                quick_code_type: 'yrform', // Ensure quickcode_type is 'yearform'
            },
            select: {
                quickcode_name: true,
            },
        });

        if (!yearFormationDetails) {
            return res.status(404).json({ error: `No quickcode details found for year_formation_code ${scholasticsAdmisnPromonDetail.year_formation_code}` });
        }

        const scholasticsDetails = await prisma.scholastics_dtl.findFirst({
            where: {
                scholastic_code: scholasticsAdmisnPromonDetail.scholastic_code,
            },
            select: {
                first_name: true,
                middle_name: true,
                last_name: true,
            },
        });

        const scholastics_name = scholasticsDetails
            ? `${scholasticsDetails.first_name || ''} ${scholasticsDetails.middle_name || ''} ${scholasticsDetails.last_name || ''}`.trim()
            : 'N/A';


        // Combine the results
        const combinedDetails = {
            ...scholasticsAdmisnPromonDetail,
            scholastics_name,
            scholastic_type_name: scholasticTypeDetails.quickcode_name, // Add scholastic_type_name
            province_name: provinceDetails.province_name, // Add province_name
            division_type_name: divisionTypeDetails.quickcode_name, // Add division_type_name
            division_name: divisionDetails.division_name, // Add division_name
            centre_name: centreDetails ? centreDetails.centre_name : null,
            formation_type_name: formationTypeDetails.quickcode_name,
            promotion_to_name: promotionToDetails.quickcode_name,
            year_formation_name: yearFormationDetails.quickcode_name,
        };

        return res.status(200).json({
            message: 'Scholastics Admission Promotion details retrieved successfully',
            data: combinedDetails,
        });
    } catch (error) {
        console.error(`Error fetching details for scholastics_admisn_code ${scholastics_admisn_code}:`, error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


export const getScholastics = async (req, res) => {
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
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({ error: "Token has expired" });
            }
            if (error.name === "JsonWebTokenError") {
                return res.status(401).json({ error: "Invalid token" });
            }
            return res.status(500).json({ error: "Failed to verify token" });
        }

        const provinceName = decoded.province_name;

        // Fetch `province_code` based on `province_name`
        const province = await prisma.province_mst.findFirst({
            where: { province_name: provinceName },
            select: { province_code: true },
        });

        if (!province) {
            return res.status(404).json({ error: "Province not found for the given name" });
        }

        const province_code = province.province_code;
        const scholastic_code = req.params.scholastic_code;

        // Fetch records from scholastics_admisn_promon_dtl table based on scholastic_code and province_code
        const scholasticsAdmisnPromonDetails = await prisma.scholastics_admisn_promon_dtl.findMany({
            where: {
                scholastic_code: scholastic_code,  // Filter by scholastic_code
                province_code: province_code,     // Filter by province_code
            },
            include: {
                // You can include related data if needed, e.g., scholastics_dtl for scholastic details
                scholastics_dtl: true,
            },
        });

        if (!scholasticsAdmisnPromonDetails || scholasticsAdmisnPromonDetails.length === 0) {
            return res.status(404).json({
                error: `No admission promotion details found for scholastic code ${scholastic_code}`,
            });
        }

        return res.status(200).json({
            message: 'Scholastics Admission Promotion details retrieved successfully',
            data: scholasticsAdmisnPromonDetails,
        });
    } catch (error) {
        console.error('Error fetching scholastics admission promotion details:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


export const getScholasticDetailsbyAdmins = async (req, res) => {
    const { scholastic_code } = req.params;

    try {
        if (scholastic_code) {
            // Get the scholastic detail by scholastic_code using findFirst
            const scholastic = await prisma.scholastics_dtl.findFirst({
                where: { scholastic_code },
            });

            if (!scholastic) {
                return res.status(404).json({ error: 'Scholastic not found.' });
            }

            // Destructure first_name, middle_name, last_name, and nationality_code from scholastic
            const { first_name, middle_name, last_name, nationality_code, province_code } = scholastic;

            // Fetch nationality name from quickcode_mst
            const quick_code_type = 'natlty';
            const nationalityCode = await prisma.quickcode_mst.findFirst({
                where: {
                    quick_code_type: quick_code_type,
                    quick_code: nationality_code,
                },
                select: { quickcode_name: true },
            });

            const nationality_name = nationalityCode ? nationalityCode.quickcode_name : 'N/A';

            // Combine first, middle, and last names
            const full_name = `${first_name || ''} ${middle_name || ''} ${last_name || ''}`.trim();

            // Get province name
            let province = await prisma.province_mst.findFirst({
                where: { province_code },
                select: { province_name: true },
            });

            const province_name = province ? province.province_name : 'N/A';

            // Fetch Admission Promotion details for the given scholastic_code (without filtering current/previous)
            let admissionPromoDetails = await prisma.scholastics_admisn_promon_dtl.findMany({
                where: { scholastic_code },
                orderBy: { start_date: 'desc' }, // Sort by start date
            });

            // Check if there are no promotion details
            if (admissionPromoDetails.length === 0) {
                return res.status(200).json({
                    ...JSON.parse(
                        JSON.stringify(scholastic, (key, value) => (typeof value === 'bigint' ? value.toString() : value))
                    ),
                    nationality_name,
                    full_name,
                    province_name,
                    message: "No promotion details available for this scholastic.",
                });
            }

            // Fetch quick code names for each promotion (without distinguishing between current and previous)
            const getQuickCodeNames = async (formationTypeCode, scholasticTypeCode, promotionToCode) => {
                try {
                    const formationType = await prisma.quickcode_mst.findFirst({
                        where: { quick_code: formationTypeCode, quick_code_type: 'fortyp' },
                    });

                    const scholasticType = await prisma.quickcode_mst.findFirst({
                        where: { quick_code: scholasticTypeCode, quick_code_type: 'schtyp' },
                    });

                    const promotionTo = await prisma.quickcode_mst.findFirst({
                        where: { quick_code: promotionToCode, quick_code_type: 'promto' },
                    });

                    return {
                        formationTypeName: formationType ? formationType.quickcode_name : 'Unknown',
                        scholasticTypeName: scholasticType ? scholasticType.quickcode_name : 'Unknown',
                        promotionToName: promotionTo ? promotionTo.quickcode_name : 'Unknown',
                    };
                } catch (error) {
                    console.error('Error fetching quickcodes:', error);
                }
            };

            const getCentreNameByCode = async (centre_code) => {
                if (!centre_code) return null;
                try {
                    const centre = await prisma.centre_dtl.findFirst({
                        where: { centre_code },
                        select: { centre_name: true },
                    });
                    return centre?.centre_name || 'Unknown';
                } catch (error) {
                    console.error('Error fetching centre name:', error);
                    return 'Unknown';
                }
            };

            const getProvinceNameByCode = async (province_code) => {
                if (!province_code) return null;
                try {
                    const province = await prisma.province_mst.findFirst({
                        where: { province_code },
                        select: { province_name: true },
                    });
                    return province?.province_name || 'Unknown';
                } catch (error) {
                    console.error('Error fetching province name:', error);
                    return 'Unknown';
                }
            };


            // Process all promotions to add quickcode names
            const promotionsWithNames = await Promise.all(
                admissionPromoDetails.map(async (promo) => {
                    const quickCodeNames = await getQuickCodeNames(
                        promo.formation_type_code,
                        promo.scholastic_type_code,
                        promo.promotion_to_code
                    );


                    const centre_name = await getCentreNameByCode(promo.centre_code);
                    const province_name = await getProvinceNameByCode(promo.province_code);

                    return {
                        ...promo,
                        formation_type_name: quickCodeNames.formationTypeName,
                        scholastic_type_name: quickCodeNames.scholasticTypeName,
                        promotion_to_name: quickCodeNames.promotionToName,
                        centre_name,
                        province_name,
                    };
                })
            );

            // Prepare the response data
            const responseData = {
                ...JSON.parse(
                    JSON.stringify(scholastic, (key, value) => (typeof value === 'bigint' ? value.toString() : value))
                ),
                nationality_name,
                full_name,
                province_name,
                promotion_details: promotionsWithNames, // Include all promotions, no filtering
            };

            return res.status(200).json(responseData);
        } else {
            return res.status(400).json({ error: 'scholastic_code is required.' });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error.message });
    }
};

export const getDetailsByProvince = async (req, res) => {
    const { province_code } = req.params; // Get province_code from the URL path parameters

    try {
        // Check if province_code is provided in the request
        if (!province_code) {
            return res.status(400).json({ error: "Province code is required" });
        }

        // Fetch the province data based on province_code
        const province = await prisma.province_mst.findFirst({
            where: { province_code: province_code },
            select: { province_name: true },
        });

        if (!province) {
            return res.status(404).json({ error: "Province not found for the given code" });
        }

        const provinceName = province.province_name;

        // Fetch Formation Types, Scholastics, and Promotion Types based on province_code
        const [formationTypes, scholastics, promotionTypes, yearOfFormation] = await Promise.all([
            // Fetch Formation Types
            prisma.quickcode_mst.findMany({
                where: {
                    quick_code_type: 'fortyp',
                    province_code: province_code,
                },
                select: {
                    quickcode_name: true,
                    quick_code: true,
                },
                orderBy: {
                    quickcode_name: "asc", // Order by name alphabetically
                },
            }),

            // Fetch Scholastics
            prisma.quickcode_mst.findMany({
                where: {
                    quick_code_type: 'schtyp',
                    province_code: province_code,
                },
                select: {
                    quickcode_name: true,
                    quick_code: true,
                },
                orderBy: {
                    quickcode_name: "asc", // Order by name alphabetically
                },
            }),

            // Fetch Promotion Types
            prisma.quickcode_mst.findMany({
                where: {
                    quick_code_type: 'promto',
                    province_code: province_code,
                },
                select: {
                    quickcode_name: true,
                    quick_code: true,
                },
                orderBy: {
                    quickcode_name: "asc",
                },
            }),

            // Fetch Year of Formation (Assuming it's stored in the quickcode_mst table with a type like 'year')
            prisma.quickcode_mst.findMany({
                where: {
                    quick_code_type: 'yrform', // Use the type that corresponds to year of formation
                    province_code: province_code,
                },
                select: {
                    quickcode_name: true, // Assuming year is stored as quickcode_name
                    quick_code: true,
                },
                orderBy: {
                    quickcode_name: "asc", // Order by year or another field
                },
            })

        ]);

        // If no data found for any category
        if (!formationTypes.length && !scholastics.length && !promotionTypes.length && !yearOfFormation.length) {
            return res.status(404).json({ message: 'No data found for the selected province' });
        }

        // Respond with all fetched data
        res.json({
            message: 'Data retrieved successfully',
            data: {
                formationTypes,
                scholastics,
                promotionTypes,
                yearOfFormation,
            },
        });
    } catch (error) {
        console.error('Error retrieving data by province:', error);
        res.status(500).json({ error: 'Failed to retrieve data' });
    }
};

export const getScholasticsByProvince = async (req, res) => {
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
        if (error.name === "TokenExpiredError") {
          return res.status(401).json({ error: "Token has expired" });
        }
        if (error.name === "JsonWebTokenError") {
          return res.status(401).json({ error: "Invalid token" });
        }
        return res.status(500).json({ error: "Failed to verify token" });
      }
  
      // Extract `province_name` from the decoded token
      const provinceName = decoded.province_name;
  
      // Fetch `province_code` based on `province_name`
      const province = await prisma.province_mst.findFirst({
        where: { province_name: provinceName },
        select: { province_code: true },
      });
  
      if (!province) {
        return res.status(404).json({ error: "Province not found for the given name" });
      }
  
      const province_code = province.province_code;
  
      // Get all scholastic details
      const scholastics = await prisma.scholastics_dtl.findMany({
        where: { province_code },
      });
  
      if (!scholastics.length) {
        return res.status(404).json({ error: "No scholastic records found" });
      }
  
      const responseData = scholastics.map((s) => {
        return {
          ...s,
          image_file_path: s.image_file_path || null,
          personal1_contact_no: s.personal1_contact_no ? s.personal1_contact_no.toString() : null,
          watsup1_no: s.watsup1_no ? s.watsup1_no.toString() : null,
          emergency_contact_no: s.emergency_contact_no ? s.emergency_contact_no.toString() : null,
        };
      }).sort((a, b) => {
        const nameA = `${a.first_name} ${a.middle_name || ''} ${a.last_name}`.trim().toLowerCase();
        const nameB = `${b.first_name} ${b.middle_name || ''} ${b.last_name}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
  
      res.status(200).json(responseData);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: error.message });
    }
  };



