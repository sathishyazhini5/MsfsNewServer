import { StatusCodes } from 'http-status-codes';
import { PrismaClient } from '@prisma/client';
import { HttpException } from '../../exceptions/HttpException.js';
import { logger } from '../../utils/logger.js';
import { JWT_SECRET } from '../../config/index.js'
import moment from 'moment';
import { provinceScopeWhere, resolveDataScope } from '../../utils/dataScope.js';

const prisma = new PrismaClient();



// export const saveAppointmentTransfer = async (req, res, next) => {
//     try {
//         const { confrer_code, province_code, designations, interProvinceTransferChk, centre_place, centre_name, division_type_code, division_code } = req.body;

//         // Validate input data
//         if (!confrer_code || !province_code || !designations || !Array.isArray(designations) || interProvinceTransferChk === undefined || !centre_place || !centre_name || !division_type_code || !division_code) {
//             throw new HttpException(StatusCodes.BAD_REQUEST, 'Missing required fields');
//         }

//         // Fetch confrere details using compound unique key
//         const confrereDetail = await prisma.confreres_dtl.findUnique({
//             where: {
//                 confrer_code_province_code: {
//                     confrer_code,
//                     province_code
//                 }
//             }
//         });

//         if (!confrereDetail) {
//             throw new HttpException(StatusCodes.NOT_FOUND, 'Confrere not found');
//         }

//         // Fetch centre details based on centre_place and centre_name
//         const centreDetail = await prisma.centre_dtl.findFirst({
//             where: { centre_place, centre_name }
//         });

//         if (!centreDetail) {
//             throw new HttpException(StatusCodes.NOT_FOUND, 'Centre details not found for the provided centre place and centre name');
//         }

//         // Validate that the province_code in centreDetail matches the confrereDetail
//         if (confrereDetail.province_code !== centreDetail.province_code) {
//             throw new HttpException(StatusCodes.BAD_REQUEST, 'Province code mismatch: Centre and Confrere do not belong to the same province');
//         }

//         // Extract necessary fields from the centreDetail
//         const { centre_place: centre_place_code, centre_code } = centreDetail;

//         // Set inter_province_transfer_chk based on the received value
//         const inter_province_transfer_chk = interProvinceTransferChk === 1 ? 1 : 0;

//         const mode = 'By Appointment';
//         const language_code = 'en';
//         const concurrency_val = 1;
//         const created_by = 'admin';
//         const created_date = new Date();

//         // Validate length constraints for string fields
//         if (centre_place_code.length > 50) throw new HttpException(StatusCodes.BAD_REQUEST, 'Centre place code exceeds length constraints');
//         if (centre_code.length > 50) throw new HttpException(StatusCodes.BAD_REQUEST, 'Centre code exceeds length constraints');

//         // Retrieve the current maximum confrer_seq_no
//         let maxSeqNoResult = await prisma.appoint_transfer_dtl.aggregate({
//             where: { confrer_code },
//             _max: {
//                 confrer_seq_no: true
//             }
//         });

//         let confrer_seq_no = (maxSeqNoResult._max.confrer_seq_no || 0) + 1;

//         // Loop through each designation object in the designations array
//         for (const designation of designations) {
//             const { designation_code, designation_appn_date, designation_taken_date, designation_end_date } = designation;

//             // Validate designation details
//             if (!designation_code || !designation_appn_date) {
//                 throw new HttpException(StatusCodes.BAD_REQUEST, 'Missing designation details');
//             }

//             // Fetch designation code
//             const quickCodeDetail = await prisma.quickcode_mst.findFirst({
//                 where: { quick_code_type: 'destyp', quick_code: designation_code }
//             });
//             if (!quickCodeDetail) {
//                 throw new HttpException(StatusCodes.NOT_FOUND, `Designation code ${designation_code} not found`);
//             }

//             // Check if the designation already exists for this confrer_code and confrer_seq_no
//             const existingDesignation = await prisma.appoint_transfer_dtl.findFirst({
//                 where: {
//                     confrer_code,
//                     designation_code,
//                     confrer_seq_no
//                 }
//             });

//             if (existingDesignation) {
//                 throw new HttpException(StatusCodes.CONFLICT, `Designation ${designation_code} already exists for confrer code ${confrer_code} and sequence number ${confrer_seq_no}`);
//             }

//             // Create entry for each designation
//             await prisma.appoint_transfer_dtl.create({
//                 data: {
//                     confrer_code,
//                     confrer_seq_no,
//                     province_code,
//                     division_type_code,
//                     division_code,
//                     centre_place_code,
//                     centre_code,
//                     inter_province_transfer_chk,
//                     designation_code,
//                     designation_appn_date: new Date(designation_appn_date),
//                     designation_taken_date: designation_taken_date ? new Date(designation_taken_date) : null,
//                     designation_end_date: designation_end_date ? new Date(designation_end_date) : null,
//                     mode,
//                     language_code,
//                     concurrency_val,
//                     created_by,
//                     created_date,
//                     updated_by: null,
//                     updated_date: null
//                 }
//             });

//             // Increment confrer_seq_no for the next designation
//             confrer_seq_no += 1;
//         }

//         // Send success response
//         res.status(StatusCodes.OK).json({ message: 'Appointment Transfers saved successfully' });

//     } catch (error) {
//         logger.error(`Error in saveAppointmentTransfer: ${error.stack}`); // Enhanced logging for better debugging
//         next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to save appointment transfer'));
//     } finally {
//         // Ensure Prisma client disconnection in both success and error scenarios
//         await prisma.$disconnect();
//     }
// };

export const saveAppointmentTransfer = async (req, res, next) => {
    try {
        const {
            confrer_code,
            province_code,
            designations,
            interProvinceTransferChk,
            centre_place,
            centre_name,
            division_type_code,
            division_code
        } = req.body;

        // Validate input data
        if (!confrer_code || !province_code || !designations || !Array.isArray(designations) || interProvinceTransferChk === undefined || !centre_place || !centre_name || !division_type_code || !division_code) {
            throw new HttpException(StatusCodes.BAD_REQUEST, 'Missing required fields');
        }

        // Length validations
        const MAX_LENGTHS = {
            confrer_code: 15,
            province_code: 10,
            division_type_code: 50,
            division_code: 10,
            centre_place_code: 50,
            centre_code: 50,
            designation_code: 10,
            mode: 25,
            language_code: 2,
            created_by: 50
        };

        const validateLength = (field, value, maxLength) => {
            if (value && value.length > maxLength) {
                throw new Error(`${field} exceeds max length of ${maxLength}. Provided value: '${value}'`);
            }
        };

        validateLength('confrer_code', confrer_code, MAX_LENGTHS.confrer_code);
        validateLength('province_code', province_code, MAX_LENGTHS.province_code);
        validateLength('division_type_code', division_type_code, MAX_LENGTHS.division_type_code);
        validateLength('division_code', division_code, MAX_LENGTHS.division_code);
        validateLength('centre_place_code', centre_place, MAX_LENGTHS.centre_place_code);
        validateLength('centre_code', centre_name, MAX_LENGTHS.centre_code);

        // Fetch confrere details
        // const confrereDetail = await prisma.confreres_dtl.findUnique({
        //     where: {
        //         confrer_code_province_code: {
        //             confrer_code,
        //             province_code
        //         }
        //     }
        // });

        // if (!confrereDetail) {
        //     throw new HttpException(StatusCodes.NOT_FOUND, 'Confrere not found');
        // }

        // Fetch centre details
        const centreDetail = await prisma.centre_dtl.findFirst({
            where: { centre_place, centre_name }
        });

        if (!centreDetail) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'Centre details not found for the provided centre place and centre name');
        }

        // // Validate that the province_code in centreDetail matches confrereDetail
        // if (confrereDetail.province_code !== centreDetail.province_code) {
        //     throw new HttpException(StatusCodes.BAD_REQUEST, 'Province code mismatch');
        // }

        const { centre_place: centre_place_code, centre_code } = centreDetail;
        const inter_province_transfer_chk = interProvinceTransferChk === 1 ? 1 : 0;
        const mode = 'By Appointment';
        const language_code = 'en';
        const concurrency_val = 1;
        const created_by = 'admin';
        const created_date = new Date();

        await prisma.appoint_transfer_dtl.updateMany({
            where: {
                confrer_code,
                designation_end_date: null
            },
            data: {
                designation_end_date: new Date()
            }
        });

        let maxSeqNoResult = await prisma.appoint_transfer_dtl.aggregate({
            where: { confrer_code },
            _max: {
                confrer_seq_no: true
            }
        });

        let confrer_seq_no = (maxSeqNoResult._max.confrer_seq_no || 0) + 1;

        for (const designation of designations) {
            const { designation_code, designation_appn_date, designation_taken_date, designation_end_date } = designation;

            if (!designation_code || !designation_appn_date) {
                throw new HttpException(StatusCodes.BAD_REQUEST, 'Missing designation details');
            }

            validateLength('designation_code', designation_code, MAX_LENGTHS.designation_code);

            try {
                await prisma.appoint_transfer_dtl.create({
                    data: {
                        confrer_code,
                        confrer_seq_no,
                        province_code,
                        division_type_code,
                        division_code,
                        centre_place_code,
                        centre_code,
                        inter_province_transfer_chk,
                        designation_code,
                        designation_appn_date: new Date(designation_appn_date),
                        designation_taken_date: designation_taken_date ? new Date(designation_taken_date) : null,
                        designation_end_date: designation_end_date ? new Date(designation_end_date) : null,
                        mode,
                        language_code,
                        concurrency_val,
                        created_by,
                        created_date,
                        updated_by: null,
                        updated_date: null
                    }
                });
            } catch (error) {
                logger.error(`Error while creating record: ${error.message}`);
                throw new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, `Error creating record for designation_code: ${designation_code}`);
            }

            confrer_seq_no += 1;
        }

        res.status(StatusCodes.OK).json({ message: 'Appointment Transfers saved successfully' });

    } catch (error) {
        logger.error(`Error in saveAppointmentTransfer: ${error.stack}`);
        next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to save appointment transfer'));
    } finally {
        await prisma.$disconnect();
    }
};





// export const saveAdditionalAppointmentTransfer = async (req, res, next) => {
//     try {
//         const { confrer_code, province_code, designations, interProvinceTransferChk, centre_place, centre_name, division_type_code, division_code } = req.body;

//         // Validate input data
//         if (!confrer_code || !province_code || !designations || !Array.isArray(designations) || interProvinceTransferChk === undefined || !centre_place || !centre_name || !division_type_code || !division_code) {
//             throw new HttpException(StatusCodes.BAD_REQUEST, 'Missing required fields');
//         }

//         // Fetch confrere details using compound unique key
//         // const confrereDetail = await prisma.confreres_dtl.findUnique({
//         //     where: {
//         //         confrer_code_province_code: {
//         //             confrer_code,
//         //             province_code
//         //         }
//         //     }
//         // });

//         // if (!confrereDetail) {
//         //     throw new HttpException(StatusCodes.NOT_FOUND, 'Confrere not found');
//         // }

//         // Fetch centre details based on centre_place and centre_name
//         const centreDetail = await prisma.centre_dtl.findFirst({
//             where: { centre_place, centre_name }
//         });

//         if (!centreDetail) {
//             throw new HttpException(StatusCodes.NOT_FOUND, 'Centre details not found for the provided centre place and centre name');
//         }

//         // // Validate that the province_code in centreDetail matches the confrereDetail
//         // if (confrereDetail.province_code !== centreDetail.province_code) {
//         //     throw new HttpException(StatusCodes.BAD_REQUEST, 'Province code mismatch: Centre and Confrere do not belong to the same province');
//         // }

//         // Extract necessary fields from the centreDetail
//         const { centre_place: centre_place_code, centre_code } = centreDetail;

//         // Set inter_province_transfer_chk based on the received value
//         const inter_province_transfer_chk = interProvinceTransferChk === 1 ? 1 : 0;

//         const mode = 'By Appointment';
//         const language_code = 'en';
//         const concurrency_val = 1;
//         const created_by = 'admin';
//         const created_date = new Date();

//         // Retrieve the current maximum confrer_seq_no
//         let maxSeqNoResult = await prisma.appoint_transfer_dtl.aggregate({
//             where: { confrer_code },
//             _max: {
//                 confrer_seq_no: true
//             }
//         });

//         let confrer_seq_no = (maxSeqNoResult._max.confrer_seq_no || 0) + 1;

//         // Now create a new entry for each designation object in the designations array
//         for (const designation of designations) {
//             const { designation_code, designation_appn_date, designation_taken_date, designation_end_date } = designation;

//             // Validate designation details
//             if (!designation_code || !designation_appn_date) {
//                 throw new HttpException(StatusCodes.BAD_REQUEST, 'Missing designation details');
//             }

//             // Fetch designation code
//             const quickCodeDetail = await prisma.quickcode_mst.findFirst({
//                 where: { quick_code_type: 'destyp', quick_code: designation_code }
//             });
//             if (!quickCodeDetail) {
//                 throw new HttpException(StatusCodes.NOT_FOUND, `Designation code ${designation_code} not found`);
//             }

//             // Create new appointment entry for the new designation
//             await prisma.appoint_transfer_dtl.create({
//                 data: {
//                     confrer_code,
//                     confrer_seq_no,
//                     province_code,
//                     division_type_code,
//                     division_code,
//                     centre_place_code,
//                     centre_code,
//                     inter_province_transfer_chk,
//                     designation_code,
//                     designation_appn_date: new Date(designation_appn_date),
//                     designation_taken_date: designation_taken_date ? new Date(designation_taken_date) : null,
//                     designation_end_date: designation_end_date ? new Date(designation_end_date) : null,
//                     mode,
//                     language_code,
//                     concurrency_val,
//                     created_by,
//                     created_date,
//                     updated_by: null,
//                     updated_date: null
//                 }
//             });

//             // Increment confrer_seq_no for the next designation
//             confrer_seq_no += 1;
//         }

//         // Send success response
//         res.status(StatusCodes.OK).json({ message: 'Appointment Transfers saved successfully' });

//     } catch (error) {
//         logger.error(`Error in saveAppointmentTransfer: ${error.stack}`); // Enhanced logging for better debugging
//         next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to save appointment transfer'));
//     } finally {
//         // Ensure Prisma client disconnection in both success and error scenarios
//         await prisma.$disconnect();
//     }
// };


export const saveAdditionalAppointmentTransfer = async (req, res, next) => {
    try {
        const { confrer_code, province_code, designations, interProvinceTransferChk, centre_place, centre_name, division_type_code, division_code } = req.body;

        // Validate input data
        if (!confrer_code || !province_code || !designations || !Array.isArray(designations) || interProvinceTransferChk === undefined || !centre_place || !centre_name || !division_type_code || !division_code) {
            throw new HttpException(StatusCodes.BAD_REQUEST, 'Missing required fields');
        }

        // Fetch centre details based on centre_place and centre_name
        const centreDetail = await prisma.centre_dtl.findFirst({
            where: { centre_place, centre_name }
        });

        if (!centreDetail) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'Centre details not found for the provided centre place and centre name');
        }

        // Extract necessary fields from the centreDetail
        const { centre_place: centre_place_code, centre_code } = centreDetail;

        // Set inter_province_transfer_chk based on the received value
        const inter_province_transfer_chk = interProvinceTransferChk === 1 ? 1 : 0;

        const mode = 'By Appointment';
        const language_code = 'en';
        const concurrency_val = 1;
        const created_by = 'admin';
        const created_date = new Date();

        // Retrieve the current maximum confrer_seq_no
        let maxSeqNoResult = await prisma.appoint_transfer_dtl.aggregate({
            where: { confrer_code },
            _max: { confrer_seq_no: true }
        });

        let confrer_seq_no = (maxSeqNoResult._max.confrer_seq_no || 0) + 1;

        // 🚨 **Check for Existing Active Appointments (designation_end_date = NULL)**
        const activeAppointments = await prisma.appoint_transfer_dtl.findMany({
            where: { confrer_code, designation_end_date: null }
        });

        for (const designation of designations) {
            const { designation_code, designation_appn_date, designation_taken_date, designation_end_date } = designation;

            // Validate designation details
            if (!designation_code || !designation_appn_date) {
                throw new HttpException(StatusCodes.BAD_REQUEST, 'Missing designation details');
            }

            // Fetch designation code
            const quickCodeDetail = await prisma.quickcode_mst.findFirst({
                where: { quick_code_type: 'destyp', quick_code: designation_code }
            });

            if (!quickCodeDetail) {
                throw new HttpException(StatusCodes.NOT_FOUND, `Designation code ${designation_code} not found`);
            }

            //   // 🚨 **Ensure we are not modifying active records**
            //   const existingActive = activeAppointments.some(app => app.designation_code === designation_code);

            //   if (existingActive) {
            //       logger.warn(`Skipping designation ${designation_code} as it is already active.`);
            //       continue; // Skip adding this designation if it's already active
            //   }

            // Create new appointment entry for the new designation
            await prisma.appoint_transfer_dtl.create({
                data: {
                    confrer_code,
                    confrer_seq_no,
                    province_code,
                    division_type_code,
                    division_code,
                    centre_place_code,
                    centre_code,
                    inter_province_transfer_chk,
                    designation_code,
                    designation_appn_date: new Date(designation_appn_date),
                    designation_taken_date: designation_taken_date ? new Date(designation_taken_date) : null,
                    designation_end_date: designation_end_date ? new Date(designation_end_date) : null, // This will be NULL for new appointments
                    mode,
                    language_code,
                    concurrency_val,
                    created_by,
                    created_date,
                    updated_by: null,
                    updated_date: null
                }
            });

            // Increment confrer_seq_no for the next designation
            confrer_seq_no += 1;
        }

        // Send success response
        res.status(StatusCodes.OK).json({ message: 'Appointment Transfers saved successfully' });

    } catch (error) {
        logger.error(`Error in saveAdditionalAppointmentTransfer: ${error.stack}`);
        next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to save appointment transfer'));
    } finally {
        // Ensure Prisma client disconnection in both success and error scenarios
        await prisma.$disconnect();
    }
};







export const getConfrereTransferDetails = async (req, res, next) => {
    const { confrer_code } = req.params;

    try {
        // Fetch transfer details by confrer_code
        const transferDetails = await prisma.appoint_transfer_dtl.findMany({
            where: { confrer_code },
            select: {
                confrer_code: true,
                confrer_seq_no: true,
                province_code: true,
                division_type_code: true,
                division_code: true,
                centre_place_code: true,
                centre_code: true,
                inter_province_transfer_chk: true,
                designation_code: true,
                designation_appn_date: true,
                designation_taken_date: true,
                designation_end_date: true,
                mode: true,
                language_code: true,
                concurrency_val: true,
                created_by: true,
                created_date: true,
                updated_by: true,
                updated_date: true
            }
        });

        if (!transferDetails || transferDetails.length === 0) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'No transfer details found for the given confrer code.');
        }

        // Fetch related names from other tables for each transfer detail
        const result = await Promise.all(
            transferDetails.map(async (detail) => {
                // Fetch province name
                const province = await prisma.province_mst.findUnique({
                    where: { province_code: detail.province_code },
                    select: { province_name: true }
                });

                // Fetch division type name (correct field)
                const divisionType = await prisma.division_setup_mst.findUnique({
                    where: { division_type_code: detail.division_type_code },
                    select: { division_name: true } // Use correct field name
                });

                // Fetch centre details
                const centre = await prisma.centre_dtl.findUnique({
                    where: {
                        centre_place: detail.centre_place_code,
                        centre_code: detail.centre_code
                    },
                    select: {
                        centre_name: true,
                        centre_place: true
                    }
                });

                // Fetch designation name
                const designation = await prisma.designation_mst.findUnique({
                    where: { designation_code: detail.designation_code },
                    select: { designation_name: true }
                });

                // Combine all details
                return {
                    ...detail,
                    province_name: province?.province_name || null,
                    division_name: divisionType?.division_name || null, // Use correct field name
                    centre_name: centre?.centre_name || null,
                    centre_place: centre?.centre_place || null,
                    designation_name: designation?.designation_name || null
                };
            })
        );


        return res.status(StatusCodes.OK).json(result);

    } catch (error) {
        logger.error(`Error fetching transfer details for confrer_code ${confrer_code}: ${error.message}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};
export const getConfrereDetails = async (req, res, next) => {
    try {
        const { confrer_code } = req.params;

        // Validate input
        if (!confrer_code) {
            throw new HttpException(StatusCodes.BAD_REQUEST, 'Confrer code is required');
        }

        // Fetch confrere details
        const confrereDetails = await prisma.confreres_dtl.findFirst({
            where: { confrer_code }
        });

        if (!confrereDetails) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'Confrere not found');
        }

        const { province_code } = confrereDetails;

        console.log('Province Code:', province_code);

        // Fetch province name using only province_code
        const provinceDetails = await prisma.province_mst.findFirst({
            where: {
                province_code
            },
            select: {
                province_name: true
            }
        });

        if (!provinceDetails) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'Province not found');
        }

        // Convert BigInt values in confrereDetails to strings
        const sanitizedConfrereDetails = {
            ...confrereDetails,
            personal1_contact_no: confrereDetails.personal1_contact_no?.toString(),
            personal2_contact_no: confrereDetails.personal2_contact_no?.toString(),
            personal3_contact_no: confrereDetails.personal3_contact_no?.toString(),
            watsup1_no: confrereDetails.watsup1_no?.toString(),
            watsup2_no: confrereDetails.watsup2_no?.toString(),
            watsup3_no: confrereDetails.watsup3_no?.toString(),
            emergency_contact_no: confrereDetails.emergency_contact_no?.toString(),
        };

        // Combine sanitized confrere details with the province name
        const response = {
            ...sanitizedConfrereDetails,
            province_name: provinceDetails.province_name
        };

        // Respond with the combined details
        res.status(StatusCodes.OK).json(response);

    } catch (error) {
        logger.error(`Error fetching confrere details: ${error.message}`);
        next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch confrere details'));
    } finally {
        await prisma.$disconnect();
    }
};

export const getConfrereAndDivisionDetails = async (req, res, next) => {
    try {
        const { confrer_code, division_type_code } = req.params;

        // Step 1: Fetch confrere details
        const confrereDetails = await prisma.confreres_dtl.findFirst({
            where: { confrer_code },
            select: {
                province_code: true,
                // Any other necessary confrere details
            }
        });

        if (!confrereDetails) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'Confrere not found');
        }

        const { province_code } = confrereDetails;

        // Step 2: Fetch divisions based on province_code and division_type_code
        const divisions = await prisma.division_setup_mst.findMany({
            where: {
                province_code,
                division_type_code: division_type_code.trim(),
            },
            select: {
                division_name: true,
                division_code: true,
            },
        });

        if (divisions.length === 0) {
            return res.status(404).json({ message: 'No divisions found for the given province and division type.' });
        }

        // Step 3: Combine results
        const response = {
            confrere: confrereDetails,
            divisions: divisions.map(division => ({
                division_name: division.division_name,
                division_code: division.division_code,
            }))
        };

        // Return combined response
        return res.status(StatusCodes.OK).json(response);

    } catch (error) {
        logger.error(`Error fetching confrere and division details: ${error.message}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};

export const getAllCenterPlaces = async (req, res, next) => {
    try {
        const places = await prisma.centre_dtl.findMany({
            select: {
                centre_place: true // Assuming `centre_place` is the field name
            },
            distinct: ['centre_place'] // Fetch distinct places
        });

        if (places.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'No center places found.' });
        }

        return res.status(StatusCodes.OK).json(places);
    } catch (error) {
        logger.error(`Error fetching center places: ${error.message}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};

// Fetch center names based on a place
export const getCenterNamesByPlace = async (req, res, next) => {
    const { centre_place } = req.params;
    const trimmedPlace = centre_place.trim();

    try {
        console.log('Querying for centre_place:', trimmedPlace);

        // Fetch center names with case-insensitive search
        const centerNames = await prisma.centre_dtl.findMany({
            where: {
                centre_place: {
                    equals: trimmedPlace,
                    mode: 'insensitive'
                }
            },
            select: {
                centre_name: true
            }
        });

        if (centerNames.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'No centers found for the given place.' });
        }

        return res.status(StatusCodes.OK).json(centerNames);
    } catch (error) {
        logger.error(`Error fetching center names for place ${trimmedPlace}: ${error.message}`);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    } finally {
        await prisma.$disconnect();
    }
};

const bigIntToString = (obj) => {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

export const getAllAppointmentTransfers = async (req, res, next) => {
    try {
        // Fetch all appointment transfers
        const appointmentTransfers = await prisma.appoint_transfer_dtl.findMany();

        // Prepare array to store transfers with related details
        const transfersWithDetails = [];

        // Loop through each appointment transfer to fetch related data
        for (const transfer of appointmentTransfers) {
            // Fetch related data from other tables
            const confrereDetails = await prisma.confreres_dtl.findFirst({
                where: { confrer_code: transfer.confrer_code }
            });

            const centreDetails = await prisma.centre_dtl.findFirst({
                where: { centre_code: transfer.centre_code }
            });

            const designationDetails = await prisma.quickcode_mst.findFirst({
                where: { quick_code: transfer.designation_code }
            });

            const divisionDetails = await prisma.division_setup_mst.findFirst({
                where: { division_code: transfer.division_code }
            });

            // Construct a combined object with all details
            transfersWithDetails.push({
                ...transfer,
                confrereDetails: confrereDetails ? bigIntToString(confrereDetails) : null,
                centreDetails: centreDetails ? bigIntToString(centreDetails) : null,
                designationDetails: designationDetails ? bigIntToString(designationDetails) : null,
                divisionDetails: divisionDetails ? bigIntToString(divisionDetails) : null
            });
        }

        // Convert BigInt values in the response to strings
        const formattedTransfers = transfersWithDetails.map(transfer => bigIntToString(transfer));

        // Send response with the combined data
        res.status(StatusCodes.OK).json({ data: formattedTransfers });

    } catch (error) {
        logger.error(`Error in getAllAppointmentTransfers: ${error.stack}`);
        next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch appointment transfers'));
    } finally {
        // Ensure Prisma client disconnection
        await prisma.$disconnect();
    }
};


export const getAppointmentTransfersByConfrerCode = async (req, res, next) => {
    try {
        const { confrer_code } = req.params; // Get confrer_code from URL parameters

        // Validate input
        if (!confrer_code) {
            throw new HttpException(StatusCodes.BAD_REQUEST, 'Confrer code is required');
        }

        // Fetch appointment transfers by confrer_code
        const appointmentTransfers = await prisma.appoint_transfer_dtl.findMany({
            where: { confrer_code },
            select: {
                confrer_code: true,
                confrer_seq_no: true,
                province_code: true,
                division_type_code: true,
                division_code: true,
                centre_place_code: true,
                centre_code: true,
                inter_province_transfer_chk: true,
                designation_code: true,
                designation_appn_date: true,
                designation_taken_date: true,
                designation_end_date: true,
                mode: true,
                language_code: true,
                concurrency_val: true,
                created_by: true,
                created_date: true,
                updated_by: true,
                updated_date: true,
            }
        });

        // Check if any transfers were found
        if (appointmentTransfers.length === 0) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'No appointment transfers found for this confrer code');
        }

        // Prepare array to store transfers with related details
        const transfersWithDetails = [];



        // Loop through each appointment transfer to fetch related data
        for (const transfer of appointmentTransfers) {
            const confrereDetails = await prisma.confreres_dtl.findFirst({
                where: { confrer_code: transfer.confrer_code },
                select: {
                    first_name: true,
                    last_name: true,
                    province_code: true // Add any additional fields you want
                }
            });

            const designationDetails = await prisma.quickcode_mst.findFirst({
                where: { quick_code: transfer.designation_code },
                select: {
                    quickcode_name: true // Include the name of the designation
                }
            });

            const provinceDetails = await prisma.province_mst.findFirst({
                where: { province_code: transfer.province_code },
                select: {
                    province_name: true,
                }
            })

            // Construct a combined object with all details
            transfersWithDetails.push({
                ...transfer,
                first_name: confrereDetails ? confrereDetails.first_name : null,
                last_name: confrereDetails ? confrereDetails.last_name : null,
                designation_name: designationDetails ? designationDetails.quickcode_name : null,
                province_name: provinceDetails ? provinceDetails.province_name : null,
            });
        }

        // Send response with the combined data
        res.status(StatusCodes.OK).json({ data: transfersWithDetails });

    } catch (error) {
        logger.error(`Error in getAppointmentTransfersByConfrerCode: ${error.stack}`);
        next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch appointment transfers'));
    } finally {
        await prisma.$disconnect();
    }
};

export const getProvinceByConfrereId = async (req, res, next) => {
    try {
        const { confrer_code } = req.params;

        // Validate confrer_code input
        if (!confrer_code) {
            throw new HttpException(StatusCodes.BAD_REQUEST, 'Confrere code is required');
        }

        // Fetch confrere details to find the associated province_code
        const confrereDetails = await prisma.confreres_dtl.findFirst({
            where: { confrer_code },
            select: {
                province_code: true
            }
        });

        // Check if confrere details exist
        if (!confrereDetails) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'Confrere not found');
        }

        const { province_code } = confrereDetails;

        // Fetch province details using province_code
        const provinceDetails = await prisma.province_mst.findFirst({
            where: { province_code },
            select: {
                province_name: true
            }
        });

        // Check if province details exist
        if (!provinceDetails) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'Province not found');
        }

        // Respond with the province name
        res.status(StatusCodes.OK).json({
            province_code,
            province_name: provinceDetails.province_name
        });

    } catch (error) {
        logger.error(`Error fetching province by confrere ID: ${error.message}`);
        next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch province details'));
    } finally {
        // Disconnect Prisma client to clean up the connection
        await prisma.$disconnect();
    }
};
import jwt from 'jsonwebtoken';
const generateToken = (user) => {
    // Add province_code to the token payload
    const payload = {
        user_id: user.user_id,
        role_code: user.role_code,
        role_name: user.role_name,
        province_code: user.province_code, // Ensure province_code is added
        province_name: user.province_name,
    };

    // Sign the token
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
};
export const getConfreresByProvince = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Ensure token is provided
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json({ error: "Access token is missing or invalid" });
        }

        // Extract the token
        const token = authHeader.split(" ")[1];

        // Verify and decode token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res
                    .status(StatusCodes.UNAUTHORIZED)
                    .json({ error: "Token has expired" });
            }
            if (error.name === "JsonWebTokenError") {
                return res
                    .status(StatusCodes.UNAUTHORIZED)
                    .json({ error: "Invalid token" });
            }
            return res
                .status(StatusCodes.INTERNAL_SERVER_ERROR)
                .json({ error: "Failed to verify token" });
        }

        // Extract province_code from decoded token
        const { province_code } = decoded;

        if (!province_code) {
            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json({ error: "Province code is missing from the token" });
        }

        // Fetch confreres associated with the province_code
        const confreres = await prisma.confreres_dtl.findMany({
            where: { province_code },
            select: {
                confrer_code: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                province_code: true,
            },
        });

        if (!confreres || confreres.length === 0) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "No confreres found for the given province" });
        }

        // Return confreres list
        res.status(StatusCodes.OK).json(confreres);
    } catch (error) {
        console.error("Error fetching confreres by province:", error.message);
        res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: "Internal server error" });
    } finally {
        await prisma.$disconnect();
    }
};





export const getConfreresByLoginProvince = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Ensure token is provided
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res
                .status(StatusCodes.UNAUTHORIZED)
                .json({ error: "Access token is missing or invalid" });
        }

        // Extract the token
        const token = authHeader.split(" ")[1];

        // Verify and decode token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res
                    .status(StatusCodes.UNAUTHORIZED)
                    .json({ error: "Token has expired" });
            }
            if (error.name === "JsonWebTokenError") {
                return res
                    .status(StatusCodes.UNAUTHORIZED)
                    .json({ error: "Invalid token" });
            }
            return res
                .status(StatusCodes.INTERNAL_SERVER_ERROR)
                .json({ error: "Failed to verify token" });
        }

        // Extract province_name from decoded token
        const provinceName = decoded.province_name;

        // Fetch province details from database to confirm its existence
        const province = await prisma.province_mst.findFirst({
            where: {
                province_name: provinceName,
            },
            select: {
                province_code: true,
            },
        });

        if (!province) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "Province not found" });
        }

        const { province_code } = province;

        // Fetch confrere details based on the province_code
        const confreres = await prisma.confreres_dtl.findMany({
            where: {
                province_code,
            },
            select: {
                confrer_code: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                province_code: true,
                birth_date: true,
                baptism_date: true,
                confirmation_date: true,
                ordination_date: true,
                personal_mailid1: true,
            },
        });

        if (!confreres || confreres.length === 0) {
            return res
                .status(StatusCodes.NOT_FOUND)
                .json({ error: "No confreres found for the given province" });
        }

        // Concatenate the name fields and format the response
        const formattedConfreres = confreres.map((confrere) => ({
            confrer_code: confrere.confrer_code,
            name: `${confrere.first_name} ${confrere.middle_name || ""} ${confrere.last_name}`.trim(),
            province_code: confrere.province_code,
            birth_date: confrere.birth_date,
            baptism_date: confrere.baptism_date,
            confirmation_date: confrere.confirmation_date,
            ordination_date: confrere.ordination_date,
            personal_mailid1: confrere.personal_mailid1,
        }));

        // Return formatted confrere details
        res.status(StatusCodes.OK).json(formattedConfreres);
    } catch (error) {
        console.error("Error fetching confrere details:", error.message);
        res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ error: "Internal server error" });
    } finally {
        await prisma.$disconnect();
    }
};






export const getCentresByProvince = async (req, res) => {
    const { province_code, division_code, division_type_code } = req.params;

    try {
        // Fetch all centres from the database
        const centreDetails = await prisma.centre_dtl.findMany({
            where: {
                province_code: province_code.trim(), // Trim to prevent leading/trailing spaces
                division_code: division_code.trim(),
                division_type_code: division_type_code.trim(),
            },
            select: {
                centre_name: true,
                centre_place: true,
                centre_code: true,
            },
        });

        // Group centres by centre_place
        const groupedCentres = Object.values(
            centreDetails.reduce((acc, centre) => {
                const { centre_place, centre_name, centre_code } = centre;

                if (!acc[centre_place]) {
                    acc[centre_place] = {
                        centre_place,
                        centres: []
                    };
                }

                acc[centre_place].centres.push({ centre_name, centre_code });

                return acc;
            }, {})
        );


        // Sort centre places in ascending order
        groupedCentres.sort((a, b) => a.centre_place.localeCompare(b.centre_place));

        // Sort centre names within each place in ascending order
        groupedCentres.forEach(group => {
            group.centres.sort((a, b) => a.centre_name.localeCompare(b.centre_name));
        });

        if (groupedCentres.length === 0) {
            return res.status(404).json({ message: 'No centers found for the given criteria' });
        }

        return res.status(200).json({
            message: 'Centre details fetched successfully',
            data: groupedCentres,
        });
    } catch (error) {
        console.error('Error fetching centre details:', error);
        return res.status(500).json({
            message: 'Failed to retrieve centre details',
            error: error.message,
        });
    }
};






export const getCentresByDivision = async (req, res) => {
    // Extract 'province_code' from the request parameters
    const { province_code, division_code, division_type_code } = req.params;

    try {
        // Query the database to find all centre details by 'province_code'
        const centreDetails = await prisma.centre_dtl.findMany({
            where: {
                province_code: province_code, // Match the province_code
                division_code: division_code,
                division_type_code: division_type_code
            },
            select: {
                centre_name: true, // Select the centre_name
                centre_place: true // Select the centre_place
            },
        });

        // Handle case when no centres are found
        if (centreDetails.length === 0) {
            return res.status(404).json({ message: 'No centres found for the given province code' });
        }

        // Successfully returning all centre names and places
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

export const getCentresByProvinceAndPlace = async (req, res) => {
    // Extract 'province_code' and 'centre_place' from the request parameters
    const { province_code, centre_place } = req.params;

    try {
        // Query the database to find centre details by 'province_code' and 'centre_place' (case-insensitive and trimmed)
        const centreDetails = await prisma.centre_dtl.findMany({
            where: {
                province_code: province_code.trim(), // Match the province_code
                centre_place: {
                    equals: centre_place.trim(), // Match the centre_place
                    mode: 'insensitive' // Case-insensitive comparison
                }
            },
            select: {
                centre_name: true, // Select the centre_name
                centre_place: true, // Select the centre_place
                centre_code: true,
            },
            orderBy: [
                { centre_place: 'asc' }, // Sort by centre_place in ascending order
                { centre_name: 'asc' } // Sort by centre_name in ascending order
            ]
        });

        // Handle case when no centres are found
        if (centreDetails.length === 0) {
            return res.status(404).json({ message: 'No centres found for the given province code and centre place' });
        }

        // Successfully return all centre names and places
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




export const getAppointmentTransfers = async (req, res, next) => {
    try {
        const { transferType } = req.query;

        // Validate transferType
        if (transferType !== '0' && transferType !== '1') {
            throw new HttpException(StatusCodes.BAD_REQUEST, 'Invalid transferType. It should be either 0 (intra-province) or 1 (inter-province).');
        }

        const { provinceCodes } = await resolveDataScope(req, prisma, req.query.province_code || null);

        // Fetch appointments
        const appointments = await prisma.appoint_transfer_dtl.findMany({
            where: {
                inter_province_transfer_chk: parseInt(transferType),
                designation_end_date: null,
                is_active: true,
                ...provinceScopeWhere(provinceCodes),
            },
        });

        // Format the response with confrere and centre details
        const formattedAppointments = await Promise.all(
            appointments.map(async (appointment) => {
                const { confrer_code, centre_code, province_code, division_code } = appointment;
                const designation_code = appointment.designation_code || null;

                // Fetch confrere details (ignore province_code for inter-province transfers)
                const confrere = await prisma.confreres_dtl.findFirst({
                    where: { confrer_code }, // Use confrer_code only
                    select: { first_name: true, middle_name: true, last_name: true },
                });

                const confrere_name = confrere
                    ? `${confrere.first_name} ${confrere.middle_name || ''} ${confrere.last_name}`.trim()
                    : 'N/A';

                // Fetch centre details
                const centreDetails = await prisma.centre_dtl.findFirst({
                    where: { centre_code },
                    select: {
                        centre_name: true,
                        centre_place: true, // Include the centre_place field
                        address1: true,
                        address2: true,
                        address3: true,
                    },
                });

                // Format the address
                const address = [
                    centreDetails?.address1 || '',
                    centreDetails?.address2 || '',
                    centreDetails?.address3 || '',
                ]
                    .filter(Boolean)
                    .join(', ');


                const designationDetail = await prisma.quickcode_mst.findFirst({
                    where: { quick_code_type: 'destyp', quick_code: designation_code },
                    select: { quickcode_name: true },
                });
                // Fetch province name
                const province = await prisma.province_mst.findFirst({
                    where: { province_code },
                    select: { province_name: true },
                })

                const division = await prisma.division_setup_mst.findFirst({
                    where: { division_code },
                    select: { division_name: true, division_type_code: true },
                });

                // Fetch division type name from quickcode_mst using division_type_code
                const divisionType = await prisma.quickcode_mst.findFirst({
                    where: { quick_code_type: 'divtyp', quick_code: division?.division_type_code },
                    select: { quickcode_name: true },
                });

                return {
                    ...appointment,
                    confrere_name,
                    centre_place: centreDetails?.centre_place || 'N/A',
                    centre_name: centreDetails?.centre_name || 'N/A',
                    address: address || 'N/A',
                    designation_name: designationDetail?.quickcode_name || 'N/A',
                    province_name: province?.province_name || 'N/A',  // Added Province Name
                    division_name: division?.division_name || 'N/A',
                    division_type_name: divisionType?.quickcode_name || 'N/A',
                };
            })
        );

        // Send response
        res.status(StatusCodes.OK).json({ data: formattedAppointments });
    } catch (error) {
        logger.error(`Error in getAppointmentTransfers: ${error.stack}`);
        next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch appointment transfers'));
    }
};





export const getDivisionNamesforall = async (req, res) => {
    const { province_code } = req.params; // Extract province_code from URL parameters
    const quick_code_type = 'divtyp'; // Hardcoded quick_code_type

    try {
        // Validate the input parameters
        if (!province_code) {
            return res.status(400).json({ error: 'Province code is required' });
        }

        // Fetch the division types based on the province_code
        const quickCodeNames = await prisma.quickcode_mst.findMany({
            where: {
                quick_code_type: quick_code_type, // Use the hardcoded value
                province_code: province_code, // Filter by the provided province_code
            },
            select: {
                quickcode_name: true,
                quick_code: true,
                quick_code_type: true,
            },
        });

        if (quickCodeNames.length === 0) {
            return res.status(404).json({ message: 'No division types found for this province' });
        }

        // Return the division types in the response
        res.json(quickCodeNames);
    } catch (error) {
        console.error('Error retrieving division types:', error);
        res.status(500).json({ error: 'Failed to retrieve division types' });
    }
};




//   export const getDivisionByProvince = async (req, res) => {
//     const { province_code } = req.params;

//     try {
//       // Fetch divisions based on province_code
//       const divisions = await prisma.division_setup_mst.findMany({
//         where: { province_code },
//         select: {
//           division_type_code: true,
//           division_name: true,
//           division_code: true,
//         },
//       });

//       if (divisions.length === 0) {
//         return res
//           .status(400)
//           .json({ message: 'No divisions found for the given province code.' });
//       }

//       // Fetch division type names for the fetched division_type_codes
//       const divisionTypeCodes = divisions.map((d) => d.division_type_code);

//       const divisionTypeNames = await prisma.quickcode_mst.findMany({
//         where: {
//           quick_code: { in: divisionTypeCodes },
//           quick_code_type: 'divtyp', // Match quick_code_type for division types
//         },
//         select: {
//           quick_code: true,
//           quickcode_name: true,
//         },
//       });

//       // Map quickcode_name to corresponding division_type_code
//       const divisionTypeNameMap = Object.fromEntries(
//         divisionTypeNames.map((type) => [type.quick_code, type.quickcode_name])
//       );

//       // Attach the division type names to the divisions
//       const formattedDivisions = divisions.map((division) => ({
//         ...division,
//         divisiontypename: divisionTypeNameMap[division.division_type_code] || null,
//       }));

//       return res
//         .status(200)
//         .json({ message: 'Divisions retrieved successfully', data: formattedDivisions });
//     } catch (error) {
//       console.error('Error fetching divisions:', error);
//       return res.status(500).json({ message: 'Could not fetch division details.' });
//     }
//   };













// export const getConfrereTransferDetailsBySeqNo = async (req, res, next) => {
//     try {
//         const { confrer_code, confrer_seq_no } = req.params; // Get `confrer_code` and `confrer_seq_no` from URL parameters

//         // Validate inputs
//         if (!confrer_code || !confrer_seq_no) {
//             throw new HttpException(StatusCodes.BAD_REQUEST, 'Confrer code and confrer sequence number are required');
//         }

//         // Fetch transfer details based on `confrer_code` and `confrer_seq_no`
//         const transferDetail = await prisma.appoint_transfer_dtl.findFirst({
//             where: {
//                 confrer_code,
//                 confrer_seq_no: parseInt(confrer_seq_no)
//             },
//             select: {
//                 confrer_code: true,
//                 confrer_seq_no: true,
//                 province_code: true,
//                 division_type_code: true,
//                 division_code: true,
//                 centre_place_code: true,
//                 centre_code: true,
//                 inter_province_transfer_chk: true,
//                 designation_code: true,
//                 designation_appn_date: true,
//                 designation_taken_date: true,
//                 designation_end_date: true,
//                 mode: true,
//                 language_code: true,
//                 concurrency_val: true,
//                 created_by: true,
//                 created_date: true,
//                 updated_by: true,
//                 updated_date: true
//             }
//         });

//         if (!transferDetail) {
//             throw new HttpException(StatusCodes.NOT_FOUND, 'No transfer details found for the given confrer code and sequence number.');
//         }

//         // Format all date fields as `YYYY/MM/DD`
//         const formattedTransferDetail = {
//             ...transferDetail,
//             designation_appn_date: transferDetail.designation_appn_date ? moment(transferDetail.designation_appn_date).format('YYYY/MM/DD') : null,
//             designation_taken_date: transferDetail.designation_taken_date ? moment(transferDetail.designation_taken_date).format('YYYY/MM/DD') : null,
//             designation_end_date: transferDetail.designation_end_date ? moment(transferDetail.designation_end_date).format('YYYY/MM/DD') : null,
//             created_date: transferDetail.created_date ? moment(transferDetail.created_date).format('YYYY/MM/DD') : null,
//             updated_date: transferDetail.updated_date ? moment(transferDetail.updated_date).format('YYYY/MM/DD') : null
//         };

//         // Fetch designation details
//         const designationDetail = await prisma.quickcode_mst.findFirst({
//             where: { quick_code: transferDetail.designation_code },
//             select: { quickcode_name: true }
//         });

//      // Assuming you have `province_code` and `country_code` available from transferDetail or related data
// // Fetch `country_code` from your database based on `province_code` or any other logic
// const province = await prisma.province_mst.findFirst({
//     where: {
//         province_code: transferDetail.province_code,
//     },
//     select: {
//         country_code: true
//     }
// });

// // Check if `country_code` is found
// if (!province || !province.country_code) {
//     throw new HttpException(StatusCodes.NOT_FOUND, 'Country code not found for the given province code');
// }

// // Now, use both `province_code` and `country_code` for your `findUnique` query
// const provinceDetail = await prisma.province_mst.findUnique({
//     where: {
//         province_code_country_code: {
//             province_code: transferDetail.province_code,
//             country_code: province.country_code // Ensure this value is available
//         }
//     },
//     select: { province_name: true }
// });


// const divisionDetail = await prisma.division_setup_mst.findUnique({
//     where: {
//         province_code_division_type_code_division_code: {
//             province_code: transferDetail.province_code, // Ensure this is available from your transfer detail
//             division_type_code: transferDetail.division_type_code, // Ensure this is available
//             division_code: transferDetail.division_code // Ensure this is available
//         }
//     },
//     select: { division_name: true }
// });


// const centreDetail = await prisma.centre_dtl.findUnique({
//     where: {
//         centre_code_province_code_division_type_code_division_code: {
//             centre_code: transferDetail.centre_code, // Ensure `transferDetail` contains this field
//             province_code: transferDetail.province_code, // Ensure this is available
//             division_type_code: transferDetail.division_type_code, // Ensure this is available
//             division_code: transferDetail.division_code // Ensure this is available
//         }
//     },
//     select: { centre_name: true }   
// });


//         // Combine all details
//         const response = {
//             ...formattedTransferDetail,
//             designation_name: designationDetail?.quickcode_name || null,
//             province_name: provinceDetail?.province_name || null,
//             division_name: divisionDetail?.division_name || null,
//             centre_name: centreDetail?.centre_name || null
//         };

//         // Send response
//         res.status(StatusCodes.OK).json(response);

//     } catch (error) {
//         logger.error(`Error fetching confrere transfer details by seq no: ${error.message}`);
//         next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch confrere transfer details'));
//     } finally {
//         // Ensure Prisma client disconnection
//         await prisma.$disconnect();
//     }
// };




export const getDivisionByProvince = async (req, res) => {
    const { province_code } = req.params;

    try {
        // Fetch divisions based on province_code
        const divisions = await prisma.division_setup_mst.findMany({
            where: { province_code },
            select: {
                division_type_code: true,
                division_name: true,
                division_code: true,
            },
        });

        if (divisions.length === 0) {
            return res
                .status(400)
                .json({ message: 'No divisions found for the given province code.' });
        }

        // Fetch division type names for the fetched division_type_codes
        const divisionTypeCodes = divisions.map((d) => d.division_type_code);

        const divisionTypeNames = await prisma.quickcode_mst.findMany({
            where: {
                quick_code: { in: divisionTypeCodes },
                quick_code_type: 'divtyp', // Match quick_code_type for division types
            },
            select: {
                quick_code: true,
                quickcode_name: true,
            },
        });

        // Map quickcode_name to corresponding division_type_code
        const divisionTypeNameMap = Object.fromEntries(
            divisionTypeNames.map((type) => [type.quick_code, type.quickcode_name])
        );

        // Group divisions by division type
        const groupedDivisions = divisions.reduce((acc, division) => {
            const divisionTypeName = divisionTypeNameMap[division.division_type_code] || 'Unknown';

            // If the division type is not already in the accumulator, add it
            if (!acc[divisionTypeName]) {
                acc[divisionTypeName] = [];
            }

            // Push the division name to the corresponding division type
            acc[divisionTypeName].push({
                division_name: division.division_name,
                division_code: division.division_code,
                division_type_code: division.division_type_code,  // Add division_type_code here
            });

            return acc;
        }, {});

        // Convert the grouped divisions into a format suitable for the response
        const formattedDivisions = Object.keys(groupedDivisions).map((divisionTypeName) => ({
            division_type_name: divisionTypeName,
            division_type_code: groupedDivisions[divisionTypeName][0]?.division_type_code,  // Include division_type_code
            divisions: groupedDivisions[divisionTypeName],
        }));

        return res
            .status(200)
            .json({ message: 'Divisions retrieved successfully', data: formattedDivisions });
    } catch (error) {
        console.error('Error fetching divisions:', error);
        return res.status(500).json({ message: 'Could not fetch division details.' });
    }
};



export const getConfrereTransferDetailsBySeqNo = async (req, res, next) => {
    try {
        const { confrer_code, confrer_seq_no } = req.params; // Get `confrer_code` and `confrer_seq_no` from URL parameters

        // Validate inputs
        if (!confrer_code || !confrer_seq_no) {
            throw new HttpException(StatusCodes.BAD_REQUEST, 'Confrer code and confrer sequence number are required');
        }

        // Fetch transfer details based on `confrer_code` and `confrer_seq_no`
        const transferDetail = await prisma.appoint_transfer_dtl.findFirst({
            where: {
                confrer_code,
                confrer_seq_no: parseInt(confrer_seq_no)
            },
            select: {
                confrer_code: true,
                confrer_seq_no: true,
                province_code: true,
                division_type_code: true,
                division_code: true,
                centre_place_code: true,
                centre_code: true,
                inter_province_transfer_chk: true,
                designation_code: true,
                designation_appn_date: true,
                designation_taken_date: true,
                designation_end_date: true,
                mode: true,
                language_code: true,
                concurrency_val: true,
                created_by: true,
                created_date: true,
                updated_by: true,
                updated_date: true
            }
        });

        if (!transferDetail) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'No transfer details found for the given confrer code and sequence number.');
        }

        // Format all date fields as `YYYY/MM/DD`
        const formattedTransferDetail = {
            ...transferDetail,
            designation_appn_date: transferDetail.designation_appn_date ? moment(transferDetail.designation_appn_date).format('YYYY/MM/DD') : null,
            designation_taken_date: transferDetail.designation_taken_date ? moment(transferDetail.designation_taken_date).format('YYYY/MM/DD') : null,
            designation_end_date: transferDetail.designation_end_date ? moment(transferDetail.designation_end_date).format('YYYY/MM/DD') : null,
            created_date: transferDetail.created_date ? moment(transferDetail.created_date).format('YYYY/MM/DD') : null,
            updated_date: transferDetail.updated_date ? moment(transferDetail.updated_date).format('YYYY/MM/DD') : null
        };

        // Fetch designation details
        const designationDetail = await prisma.quickcode_mst.findFirst({
            where: { quick_code: transferDetail.designation_code },
            select: { quickcode_name: true }
        });

        // Fetch province details
        const province = await prisma.province_mst.findFirst({
            where: {
                province_code: transferDetail.province_code,
            },
            select: {
                country_code: true
            }
        });

        if (!province || !province.country_code) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'Country code not found for the given province code');
        }

        const provinceDetail = await prisma.province_mst.findUnique({
            where: {
                province_code_country_code: {
                    province_code: transferDetail.province_code,
                    country_code: province.country_code
                }
            },
            select: { province_name: true }
        });

        // Fetch division details
        const divisionDetail = await prisma.division_setup_mst.findUnique({
            where: {
                province_code_division_type_code_division_code: {
                    province_code: transferDetail.province_code,
                    division_type_code: transferDetail.division_type_code,
                    division_code: transferDetail.division_code
                }
            },
            select: { division_name: true }
        });

        // Fetch division type name from `quickcode_mst`
        const divisionTypeDetail = await prisma.quickcode_mst.findFirst({
            where: {
                quick_code_type: 'divtyp',
                quick_code: transferDetail.division_type_code
            },
            select: { quickcode_name: true }
        });

        // Fetch centre details
        const centreDetail = await prisma.centre_dtl.findUnique({
            where: {
                centre_code_province_code_division_type_code_division_code: {
                    centre_code: transferDetail.centre_code,
                    province_code: transferDetail.province_code,
                    division_type_code: transferDetail.division_type_code,
                    division_code: transferDetail.division_code
                }
            },
            select: { centre_name: true }
        });

        // Combine all details
        const response = {
            ...formattedTransferDetail,
            designation_name: designationDetail?.quickcode_name || null,
            province_name: provinceDetail?.province_name || null,
            division_name: divisionDetail?.division_name || null,
            division_type_name: divisionTypeDetail?.quickcode_name || null,
            centre_name: centreDetail?.centre_name || null,
            centre_place_name: transferDetail.centre_place_code || null  // Using `centre_place_code` directly as `centre_place_name`
        };

        // Send response
        res.status(StatusCodes.OK).json(response);

    } catch (error) {
        logger.error(`Error fetching confrere transfer details by seq no: ${error.message}`);
        next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message || 'Failed to fetch confrere transfer details'));
    } finally {
        // Ensure Prisma client disconnection
        await prisma.$disconnect();
    }
};



export const getConfrereTransferDetailsByCode = async (req, res, next) => {
    try {
        const { confrer_code } = req.params;

        if (!confrer_code) {
            throw new HttpException(StatusCodes.BAD_REQUEST, 'Confrer code is required');
        }

        // Fetch transfer details from appoint_transfer_dtl
        const transferDetails = await prisma.appoint_transfer_dtl.findMany({
            where: {
                confrer_code,
                designation_end_date: null,
            },
            select: {
                confrer_code: true,
                confrer_seq_no: true,
                province_code: true,
                division_type_code: true,
                division_code: true,
                centre_place_code: true,
                centre_code: true,
                inter_province_transfer_chk: true,
                designation_code: true,
                designation_appn_date: true,
                designation_taken_date: true,
                designation_end_date: true,
                mode: true,
                language_code: true,
                concurrency_val: true,
                created_by: true,
                created_date: true,
                updated_by: true,
                updated_date: true,
            },
        });

        if (!transferDetails.length) {
            throw new HttpException(StatusCodes.NOT_FOUND, 'No transfer details found for the given confrer code.');
        }

        // Format and enrich transfer details with names
        const formattedTransferDetails = await Promise.all(
            transferDetails.map(async (transferDetail) => {
                const formattedDetail = {
                    ...transferDetail,
                    designation_appn_date: transferDetail.designation_appn_date
                        ? moment(transferDetail.designation_appn_date).format('YYYY-MM-DD')
                        : null,
                    designation_taken_date: transferDetail.designation_taken_date
                        ? moment(transferDetail.designation_taken_date).format('YYYY-MM-DD')
                        : null,
                    designation_end_date: transferDetail.designation_end_date
                        ? moment(transferDetail.designation_end_date).format('YYYY-MM-DD')
                        : null,
                    created_date: transferDetail.created_date
                        ? moment(transferDetail.created_date).format('YYYY-MM-DD')
                        : null,
                    updated_date: transferDetail.updated_date
                        ? moment(transferDetail.updated_date).format('YYYY-MM-DD')
                        : null,
                };

                // Fetch additional details
                const [designationDetail, divisionDetail, divisionTypeDetail, centreDetail, provinceDetail] = await Promise.all([
                    prisma.quickcode_mst.findFirst({
                        where: { quick_code: transferDetail.designation_code },
                        select: { quickcode_name: true },
                    }),
                    prisma.division_setup_mst.findUnique({
                        where: {
                            province_code_division_type_code_division_code: {
                                province_code: transferDetail.province_code,
                                division_type_code: transferDetail.division_type_code,
                                division_code: transferDetail.division_code,
                            },
                        },
                        select: { division_name: true },
                    }),
                    prisma.quickcode_mst.findFirst({
                        where: {
                            quick_code_type: 'divtyp',
                            quick_code: transferDetail.division_type_code,
                        },
                        select: { quickcode_name: true },
                    }),
                    prisma.centre_dtl.findFirst({
                        where: {
                            centre_code: transferDetail.centre_code,
                            province_code: transferDetail.province_code,
                            division_type_code: transferDetail.division_type_code,
                            division_code: transferDetail.division_code,
                        },
                        select: { centre_name: true },
                    }),
                    prisma.province_mst.findFirst({
                        where: { province_code: transferDetail.province_code },
                        select: { province_name: true },
                    }),
                ]);

                // Combine all data into a single object
                return {
                    ...formattedDetail,
                    designation_name: designationDetail?.quickcode_name || null,
                    province_name: provinceDetail?.province_name || null,
                    division_name: divisionDetail?.division_name || null,
                    division_type_name: divisionTypeDetail?.quickcode_name || null,
                    centre_name: centreDetail?.centre_name || null,
                    centre_place_name: transferDetail.centre_place_code || null,
                };
            })
        );

        res.status(StatusCodes.OK).json(formattedTransferDetails);
    } catch (error) {
        logger.error(`Error fetching confrere transfer details by code: ${error.message}`);
        next(
            new HttpException(
                error.status || StatusCodes.INTERNAL_SERVER_ERROR,
                error.message || 'Failed to fetch confrere transfer details'
            )
        );
    } finally {
        await prisma.$disconnect(); // Ensure Prisma disconnection
    }
};



// export const updateAppointmentTransfer = async (req, res, next) => {
//   try {
//     const { confrer_code, confrer_seq_no } = req.params;
//     const {
//       designation_code,
//       designation_appn_date,
//       designation_taken_date,
//       province_code,
//       division_type_code,
//       division_code,
//       centre_place_code,
//       centre_name, // Expect centre_name instead of centre_code
//     } = req.body;

//     logger.info(
//       `Update Request - Confrer Code: ${confrer_code}, Seq No: ${confrer_seq_no}`
//     );

//     const updateData = {};

//     // Validate and add to updateData if the fields exist
//     if (designation_code) {
//       updateData.designation_code = designation_code.trim();
//     }

//     // Validate and convert designation_appn_date to a Date object
//     if (designation_appn_date) {
//       if (
//         !moment(designation_appn_date, ["YYYY-MM-DD", "YYYY/MM/DD"], true).isValid()
//       ) {
//         logger.error(`Invalid designation_appn_date format: ${designation_appn_date}`);
//         throw new HttpException(
//           StatusCodes.BAD_REQUEST,
//           "Invalid format for designation_appn_date. Expected format: YYYY-MM-DD or ISO-8601"
//         );
//       }
//       updateData.designation_appn_date = new Date(
//         moment(designation_appn_date).toISOString()
//       ); // Convert to ISO-8601 DateTime
//     }

//     // Validate and convert designation_taken_date to a Date object
//     if (designation_taken_date) {
//       if (
//         !moment(designation_taken_date, ["YYYY-MM-DD", "YYYY/MM/DD"], true).isValid()
//       ) {
//         logger.error(
//           `Invalid designation_taken_date format: ${designation_taken_date}`
//         );
//         throw new HttpException(
//           StatusCodes.BAD_REQUEST,
//           "Invalid format for designation_taken_date. Expected format: YYYY-MM-DD or ISO-8601"
//         );
//       }
//       updateData.designation_taken_date = new Date(
//         moment(designation_taken_date).toISOString()
//       ); // Convert to ISO-8601 DateTime
//     }

//     if (province_code) {
//       updateData.province_code = province_code.trim();
//     }

//     if (centre_place_code) {
//       updateData.centre_place_code = centre_place_code.trim();
//     }

//     // Map `centre_name` to its corresponding `centre_code`
//     if (centre_name) {
//       const centerDetail = await prisma.centre_dtl.findFirst({
//         where: {
//           centre_name: centre_name.trim(), // Match the name
//           province_code: province_code, // Optional: add constraints like province_code
//           division_type_code: division_type_code,
//           division_code: division_code,
//         },
//         select: { centre_code: true }, // Only fetch the `centre_code`
//       });

//       if (!centerDetail) {
//         logger.error(`No matching center found for name: ${centre_name}`);
//         throw new HttpException(
//           StatusCodes.BAD_REQUEST,
//           `Invalid center name: ${centre_name}`
//         );
//       }

//       updateData.centre_code = centerDetail.centre_code; // Add the mapped center code
//     }

//     if (division_type_code) {
//       updateData.division_type_code = division_type_code.trim();
//     }

//     if (division_code) {
//       updateData.division_code = division_code.trim();
//     }

//     // Ensure there is at least one field to update
//     if (Object.keys(updateData).length === 0) {
//       throw new HttpException(StatusCodes.BAD_REQUEST, "No fields provided to update");
//     }

//     // Proceed with the update operation
//     const updateResult = await prisma.appoint_transfer_dtl.updateMany({
//       where: {
//         confrer_code,
//         confrer_seq_no: parseInt(confrer_seq_no, 10),
//       },
//       data: updateData,
//     });

//     if (updateResult.count === 0) {
//       throw new HttpException(
//         StatusCodes.NOT_FOUND,
//         "Appointment transfer not found"
//       );
//     }

//     res.status(StatusCodes.OK).json({ message: "Update successful",updateData });
//     console.log(updateData)
//   } catch (error) {
//     logger.error(`Error in updateAppointmentTransfer: ${error.message}`);
//     next(
//       new HttpException(
//         error.status || StatusCodes.INTERNAL_SERVER_ERROR,
//         error.message
//       )
//     );
//   } finally {
//     // Ensure Prisma client disconnection
//     await prisma.$disconnect();
//   }
// };


export const updateAppointmentTransfer = async (req, res, next) => {
    try {
        const { confrer_code, confrer_seq_no } = req.params;
        const {
            designation_code,
            designation_appn_date,
            designation_taken_date,
            province_code,
            division_type_code,
            division_code,
            centre_place_code,
            centre_name
        } = req.body;

        logger.info(`Update Request - Confrer Code: ${confrer_code}, Seq No: ${confrer_seq_no}`);

        const updateData = {};

        // **1. Fetch existing appointment transfer record**
        const existingAppointment = await prisma.appoint_transfer_dtl.findFirst({
            where: {
                confrer_code,
                confrer_seq_no: parseInt(confrer_seq_no, 10)
            }
        });

        if (!existingAppointment) {
            throw new HttpException(StatusCodes.NOT_FOUND, "Appointment transfer not found");
        }

        // **2. Find latest confrer_his_seq_no and insert into history table**
        const lastHistory = await prisma.appoint_transfer_his_dtl.findFirst({
            where: { confrer_code },
            orderBy: { confrer_his_seq_no: 'desc' },
            select: { confrer_his_seq_no: true }
        });

        // **Determine the new confrer_his_seq_no**
        const newConfrerHisSeqNo = lastHistory ? lastHistory.confrer_his_seq_no + 1 : 1;

        const endDate = new Date();

        await prisma.appoint_transfer_his_dtl.create({
            data: {
                confrer_his_seq_no: newConfrerHisSeqNo, // ✅ Add the required sequence number
                ...existingAppointment, // ✅ Copy all fields from the existing appointment
                created_date: new Date(), // ✅ Store the update timestamp
                designation_end_date: endDate,
                is_active: undefined
            }
        });

        logger.info(`Old data moved to history table for Confrer Code: ${confrer_code} with history sequence: ${newConfrerHisSeqNo}`);


        logger.info(`Old data moved to history table for Confrer Code: ${confrer_code}`);

        // **3. Determine if it's an Inter-Province transfer**
        const previousProvinceCode = existingAppointment.province_code;
        let inter_province_transfer_chk = existingAppointment.inter_province_transfer_chk;

        if (province_code && province_code !== previousProvinceCode) {
            logger.info(`Province change detected: ${previousProvinceCode} → ${province_code}`);
            inter_province_transfer_chk = 1; // Mark as inter-province
        } else {
            inter_province_transfer_chk = 0; // Remain intra-province
        }

        // **4. Prepare update fields**
        if (designation_code) updateData.designation_code = designation_code.trim();
        if (province_code) updateData.province_code = province_code.trim();
        if (centre_place_code) updateData.centre_place_code = centre_place_code.trim();
        if (division_type_code) updateData.division_type_code = division_type_code.trim();
        if (division_code) updateData.division_code = division_code.trim();
        updateData.inter_province_transfer_chk = inter_province_transfer_chk;

        // **Validate and format dates**
        if (designation_appn_date && moment(designation_appn_date, ["YYYY-MM-DD", "YYYY/MM/DD"], true).isValid()) {
            updateData.designation_appn_date = new Date(moment(designation_appn_date).toISOString());
        }
        if (designation_taken_date && moment(designation_taken_date, ["YYYY-MM-DD", "YYYY/MM/DD"], true).isValid()) {
            updateData.designation_taken_date = new Date(moment(designation_taken_date).toISOString());
        }

        // **5. Map `centre_name` to `centre_code`**
        if (centre_name) {
            const centerDetail = await prisma.centre_dtl.findFirst({
                where: {
                    centre_name: centre_name.trim(),
                    province_code: province_code,
                    division_type_code: division_type_code,
                    division_code: division_code
                },
                select: { centre_code: true }
            });

            if (!centerDetail) {
                throw new HttpException(StatusCodes.BAD_REQUEST, `Invalid center name: ${centre_name}`);
            }
            updateData.centre_code = centerDetail.centre_code;
        }

        // **6. Ensure at least one field is updated**
        if (Object.keys(updateData).length === 0) {
            throw new HttpException(StatusCodes.BAD_REQUEST, "No fields provided to update");
        }

        // **7. Proceed with the update operation**
        const updateResult = await prisma.appoint_transfer_dtl.updateMany({
            where: {
                confrer_code,
                confrer_seq_no: parseInt(confrer_seq_no, 10)
            },
            data: updateData
        });

        if (updateResult.count === 0) {
            throw new HttpException(StatusCodes.NOT_FOUND, "Appointment transfer not found");
        }

        res.status(StatusCodes.OK).json({ message: "Update successful", updateData });

    } catch (error) {
        logger.error(`Error in updateAppointmentTransfer: ${error.message}`);
        next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    } finally {
        await prisma.$disconnect();
    }
};




export const getAppointmentTransferDesignations = async (req, res, next) => {
    try {
        const { confrer_code, confrer_seq_no } = req.params;

        if (!confrer_code || !confrer_seq_no) {
            throw new HttpException(
                StatusCodes.BAD_REQUEST,
                'Missing required URL parameters: confrer_code and confrer_seq_no'
            );
        }

        const designations = await prisma.appoint_transfer_dtl.findMany({
            where: {
                confrer_code: confrer_code,
                confrer_seq_no: parseInt(confrer_seq_no, 10),
            },
            select: {
                designation_code: true,
                designation_appn_date: true,
                designation_taken_date: true,
                designation_end_date: true,
            },
        });

        if (designations.length === 0) {
            throw new HttpException(
                StatusCodes.NOT_FOUND,
                'No designations found for the provided confrer_code and confrer_seq_no'
            );
        }

        res.status(StatusCodes.OK).json(designations);
    } catch (error) {
        logger.error(`Error in getAppointmentTransferDesignations: ${error.stack}`);
        next(
            new HttpException(
                error.status || StatusCodes.INTERNAL_SERVER_ERROR,
                error.message || 'Failed to fetch appointment transfer designations'
            )
        );
    } finally {
        await prisma.$disconnect();
    }
};


export const deleteAppointmentTransfer = async (req, res, next) => {
    try {
        const { confrer_code, confrer_seq_no } = req.params;

        // Log incoming parameters for debugging
        logger.info(`Delete request for confrer_code=${confrer_code}, confrer_seq_no=${confrer_seq_no}`);

        // Ensure confrer_seq_no is an integer
        const seqNo = parseInt(confrer_seq_no, 10);

        // Check if the record exists
        const existingRecord = await prisma.appoint_transfer_dtl.findFirst({
            where: {
                confrer_code,
                confrer_seq_no: seqNo,
            },
        });

        if (!existingRecord) {
            logger.warn(`No record found for confrer_code=${confrer_code}, confrer_seq_no=${seqNo}`);
            return res.status(StatusCodes.NOT_FOUND).json({ message: 'Appointment transfer not found' });
        }
        const lastHistoryRecord = await prisma.appoint_transfer_his_dtl.findFirst({
            where: { confrer_code },
            orderBy: { confrer_his_seq_no: 'desc' },
        });

        const nextHisSeqNo = lastHistoryRecord ? lastHistoryRecord.confrer_his_seq_no + 1 : 1;
        const endDate = new Date();

        // Step 3: Move the record to `appoint_transfer_his_dtl`
        await prisma.appoint_transfer_his_dtl.create({
            data: {
                ...existingRecord, // Copy all fields from the original record
                confrer_his_seq_no: nextHisSeqNo, // Assign the new sequence number
                created_date: new Date(), // Add a timestamp for deletion
                designation_end_date: endDate,
                is_active: undefined,
            },
        });


        // Delete the record
        await prisma.appoint_transfer_dtl.delete({
            where: {
                confrer_code_confrer_seq_no: {
                    confrer_code,
                    confrer_seq_no: seqNo,
                },
            },
        });

        logger.info(`Successfully deleted confrer_code=${confrer_code}, confrer_seq_no=${seqNo}`);
        return res.status(StatusCodes.OK).json({ message: 'Delete successful' });
    } catch (error) {
        logger.error(`Error deleting appointment transfer: ${error.message}`);
        next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    }
};


// export const EditAppointmentTransfer = async (req, res, next) => {
//     try {
//         const { confrer_code, confrer_seq_no } = req.params;
//         const {
//             designation_code,
//             designation_appn_date,
//             designation_taken_date,
//             province_code,
//             division_type_code,
//             division_code,
//             centre_place_code,
//             centre_name // Expect centre_name instead of centre_code
//         } = req.body;

//         logger.info(
//             `Update Request - Confrer Code: ${confrer_code}, Seq No: ${confrer_seq_no}`
//         );

//         const updateData = {};

//         // **Fetch existing appointment transfer record**
//         const existingAppointment = await prisma.appoint_transfer_dtl.findFirst({
//             where: {
//                 confrer_code,
//                 confrer_seq_no: parseInt(confrer_seq_no, 10)
//             },
//             select: {
//                 province_code: true,
//                 inter_province_transfer_chk: true
//             }
//         });

//         if (!existingAppointment) {
//             throw new HttpException(StatusCodes.NOT_FOUND, "Appointment transfer not found");
//         }

//         const previousProvinceCode = existingAppointment.province_code;
//         let inter_province_transfer_chk = existingAppointment.inter_province_transfer_chk;

//         // **Check if province code is changing**
//         if (province_code && province_code !== previousProvinceCode) {
//             logger.info(`Province change detected: ${previousProvinceCode} → ${province_code}`);
//             inter_province_transfer_chk = 1; // **Set as Inter-province transfer**
//         } else {
//             inter_province_transfer_chk = 0; // **Remain as Intra-province transfer**
//         }

//         // **Update designation details**
//         if (designation_code) {
//             updateData.designation_code = designation_code.trim();
//         }

//         if (designation_appn_date) {
//             if (!moment(designation_appn_date, ["YYYY-MM-DD", "YYYY/MM/DD"], true).isValid()) {
//                 logger.error(`Invalid designation_appn_date format: ${designation_appn_date}`);
//                 throw new HttpException(StatusCodes.BAD_REQUEST, "Invalid format for designation_appn_date. Expected format: YYYY-MM-DD");
//             }
//             updateData.designation_appn_date = new Date(moment(designation_appn_date).toISOString());
//         }

//         if (designation_taken_date) {
//             if (!moment(designation_taken_date, ["YYYY-MM-DD", "YYYY/MM/DD"], true).isValid()) {
//                 logger.error(`Invalid designation_taken_date format: ${designation_taken_date}`);
//                 throw new HttpException(StatusCodes.BAD_REQUEST, "Invalid format for designation_taken_date. Expected format: YYYY-MM-DD");
//             }
//             updateData.designation_taken_date = new Date(moment(designation_taken_date).toISOString());
//         }

//         if (province_code) {
//             updateData.province_code = province_code.trim();
//         }

//         if (centre_place_code) {
//             updateData.centre_place_code = centre_place_code.trim();
//         }

//         // **Map `centre_name` to `centre_code`**
//         if (centre_name) {
//             const centerDetail = await prisma.centre_dtl.findFirst({
//                 where: {
//                     centre_name: centre_name.trim(),
//                     province_code: province_code,
//                     division_type_code: division_type_code,
//                     division_code: division_code
//                 },
//                 select: { centre_code: true }
//             });

//             if (!centerDetail) {
//                 logger.error(`No matching center found for name: ${centre_name}`);
//                 throw new HttpException(StatusCodes.BAD_REQUEST, `Invalid center name: ${centre_name}`);
//             }

//             updateData.centre_code = centerDetail.centre_code;
//         }

//         if (division_type_code) {
//             updateData.division_type_code = division_type_code.trim();
//         }

//         if (division_code) {
//             updateData.division_code = division_code.trim();
//         }

//         // **Update `inter_province_transfer_chk`**
//         updateData.inter_province_transfer_chk = inter_province_transfer_chk;
//         logger.info(`Updated inter_province_transfer_chk: ${inter_province_transfer_chk}`);

//         // **Ensure at least one field is updated**
//         if (Object.keys(updateData).length === 0) {
//             throw new HttpException(StatusCodes.BAD_REQUEST, "No fields provided to update");
//         }

//         // **Proceed with the update operation**
//         const updateResult = await prisma.appoint_transfer_dtl.updateMany({
//             where: {
//                 confrer_code,
//                 confrer_seq_no: parseInt(confrer_seq_no, 10)
//             },
//             data: updateData
//         });

//         if (updateResult.count === 0) {
//             throw new HttpException(StatusCodes.NOT_FOUND, "Appointment transfer not found");
//         }

//         res.status(StatusCodes.OK).json({ message: "Update successful", updateData });

//         console.log(updateData);

//     } catch (error) {
//         logger.error(`Error in updateAppointmentTransfer: ${error.message}`);
//         next(
//             new HttpException(
//                 error.status || StatusCodes.INTERNAL_SERVER_ERROR,
//                 error.message
//             )
//         );
//     } finally {
//         await prisma.$disconnect();
//     }
// };

export const EditAppointmentTransfer = async (req, res, next) => {
    try {
        const { confrer_code, confrer_seq_no } = req.params;
        const {
            designation_code,
            designation_appn_date,
            designation_taken_date,
            province_code,
            division_type_code,
            division_code,
            centre_place_code,
            centre_name // Expect centre_name instead of centre_code
        } = req.body;

        logger.info(`Update Request - Confrer Code: ${confrer_code}, Seq No: ${confrer_seq_no}`);

        const updateData = {};

        // **Fetch existing appointment transfer record**
        const existingAppointment = await prisma.appoint_transfer_dtl.findFirst({
            where: {
                confrer_code,
                confrer_seq_no: parseInt(confrer_seq_no, 10)
            },
            select: {
                province_code: true,
                inter_province_transfer_chk: true // **Fetch but do NOT modify**
            }
        });

        if (!existingAppointment) {
            throw new HttpException(StatusCodes.NOT_FOUND, "Appointment transfer not found");
        }

        // **Do NOT modify inter_province_transfer_chk**
        const inter_province_transfer_chk = existingAppointment.inter_province_transfer_chk;

        // **Update designation details**
        if (designation_code) {
            updateData.designation_code = designation_code.trim();
        }

        updateData.designation_appn_date = moment
            .utc(designation_appn_date, ["YYYY-MM-DD", "YYYY/MM/DD"], true)
            .startOf("day")
            .toDate();

        updateData.designation_taken_date = moment
            .utc(designation_taken_date, ["YYYY-MM-DD", "YYYY/MM/DD"], true)
            .startOf("day")
            .toDate();





        if (province_code) {
            updateData.province_code = province_code.trim();
        }

        if (centre_place_code) {
            updateData.centre_place_code = centre_place_code.trim();
        }

        // **Map `centre_name` to `centre_code`**
        if (centre_name) {
            const centerDetail = await prisma.centre_dtl.findFirst({
                where: {
                    centre_name: centre_name.trim(),
                    province_code: province_code,
                    division_type_code: division_type_code,
                    division_code: division_code
                },
                select: { centre_code: true }
            });

            if (!centerDetail) {
                logger.error(`No matching center found for name: ${centre_name}`);
                throw new HttpException(StatusCodes.BAD_REQUEST, `Invalid center name: ${centre_name}`);
            }

            updateData.centre_code = centerDetail.centre_code;
        }

        if (division_type_code) {
            updateData.division_type_code = division_type_code.trim();
        }

        if (division_code) {
            updateData.division_code = division_code.trim();
        }

        // **Ensure at least one field is updated**
        if (Object.keys(updateData).length === 0) {
            throw new HttpException(StatusCodes.BAD_REQUEST, "No fields provided to update");
        }

        // **Proceed with the update operation**
        const updateResult = await prisma.appoint_transfer_dtl.updateMany({
            where: {
                confrer_code,
                confrer_seq_no: parseInt(confrer_seq_no, 10)
            },
            data: updateData
        });

        if (updateResult.count === 0) {
            throw new HttpException(StatusCodes.NOT_FOUND, "Appointment transfer not found");
        }

        res.status(StatusCodes.OK).json({ message: "Update successful", updateData });

        console.log(updateData);

    } catch (error) {
        logger.error(`Error in updateAppointmentTransfer: ${error.message}`);
        next(new HttpException(error.status || StatusCodes.INTERNAL_SERVER_ERROR, error.message));
    } finally {
        await prisma.$disconnect();
    }
};


export const getConfreresWithDetailsByProvince = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        // Ensure token is provided
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Access token is missing or invalid" });
        }

        // Extract the token
        const token = authHeader.split(" ")[1];

        // Verify and decode token
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Token has expired" });
            }
            if (error.name === "JsonWebTokenError") {
                return res.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid token" });
            }
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to verify token" });
        }

        // Extract province_name from decoded token
        const provinceName = decoded.province_name;

        // Fetch province details to confirm its existence
        const province = await prisma.province_mst.findFirst({
            where: { province_name: provinceName },
            select: { province_code: true },
        });

        if (!province) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: "Province not found" });
        }

        const { province_code } = province;

        // Fetch confrere details based on the province_code
        const confreres = await prisma.confreres_dtl.findMany({
            where: { province_code, is_active: true },
            select: {
                confrer_code: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                member_type_code: true,
                province_code: true,
                image_file_name: true,
                image_file_path: true,
                birth_date: true,
                baptism_date: true,
                confirmation_date: true,
                first_profession_date: true,
                final_profession_date: true,
                ordination_date: true,
                personal1_isd: true,
                personal1_contact_no: true,
                watsup1_isd: true,
                watsup1_no: true,
                personal_mailid1: true,
                language_code: true,
                concurrency_val: true,
                created_by: true,
                created_date: true,
                updated_by: true,
                updated_date: true,
            },
            orderBy: [
                { first_name: "asc" },
                { middle_name: "asc" },
                { last_name: "asc" }
            ]
        });

        if (!confreres || confreres.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: "No confreres found for the given province" });
        }

        // Fetch additional member type details and format the response
        const responseResult = await Promise.all(
            confreres.map(async (confrere) => {
                if (!confrere.member_type_code) {
                    console.warn(`Missing member_type_code for confrere: ${confrere.confrer_code}`);
                    return {
                        confrer_code: confrere.confrer_code,
                        confrere_name: `${confrere.first_name || ''} ${confrere.middle_name || ''} ${confrere.last_name || ''}`.trim(),
                        province_code: confrere.province_code,
                        image_file_name: confrere.image_file_name,
                        image_file_path: confrere.image_file_path,
                        birth_date: confrere.birth_date,
                        baptism_date: confrere.baptism_date,
                        confirmation_date: confrere.confirmation_date,
                        first_profession_date: confrere.first_profession_date,
                        final_profession_date: confrere.final_profession_date,
                        ordination_date: confrere.ordination_date,
                        personal1_isd: confrere.personal1_isd,
                        personal1_contact_no: confrere.personal1_contact_no ? confrere.personal1_contact_no.toString() : null,
                        watsup1_isd: confrere.watsup1_isd,
                        watsup1_no: confrere.watsup1_no ? confrere.watsup1_no.toString() : null,
                        personal_mailid1: confrere.personal_mailid1,
                        language_code: confrere.language_code,
                        concurrency_val: confrere.concurrency_val,
                        created_by: confrere.created_by,
                        created_date: confrere.created_date,
                        updated_by: confrere.updated_by,
                        updated_date: confrere.updated_date,
                    };
                }

                const memberType = await prisma.quickcode_mst.findFirst({
                    where: {
                        quick_code: confrere.member_type_code,
                        quick_code_type: "memtyp",
                    },
                    select: { quickcode_name: true },
                });

                const fullName = `${confrere.first_name || ''} ${confrere.middle_name || ''} ${confrere.last_name || ''}`.trim();

                return {
                    confrer_code: confrere.confrer_code,
                    confrere_name: memberType
                        ? `${fullName} [${memberType.quickcode_name}]`
                        : fullName,
                    province_code: confrere.province_code,
                    image_file_name: confrere.image_file_name,
                    image_file_path: confrere.image_file_path,
                    birth_date: confrere.birth_date,
                    baptism_date: confrere.baptism_date,
                    confirmation_date: confrere.confirmation_date,
                    first_profession_date: confrere.first_profession_date,
                    final_profession_date: confrere.final_profession_date,
                    ordination_date: confrere.ordination_date,
                    personal1_isd: confrere.personal1_isd,
                    personal1_contact_no: confrere.personal1_contact_no ? confrere.personal1_contact_no.toString() : null,
                    watsup1_isd: confrere.watsup1_isd,
                    watsup1_no: confrere.watsup1_no ? confrere.watsup1_no.toString() : null,
                    personal_mailid1: confrere.personal_mailid1,
                    language_code: confrere.language_code,
                    concurrency_val: confrere.concurrency_val,
                    created_by: confrere.created_by,
                    created_date: confrere.created_date,
                    updated_by: confrere.updated_by,
                    updated_date: confrere.updated_date,
                };
            })
        );


        res.status(StatusCodes.OK).json(responseResult);
    } catch (error) {
        console.error("Error fetching confreres with details:", error.message);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "An error occurred while fetching confreres with details" });
    } finally {
        await prisma.$disconnect();
    }
};



export const getConfreresWithDetailsforallprovinces = async (req, res) => {
    try {
        // Fetch all confrere details without filtering by province
        const confreres = await prisma.confreres_dtl.findMany({
            select: {
                confrer_code: true,
                first_name: true,
                middle_name: true,
                last_name: true,
                member_type_code: true,
                province_code: true,
                image_file_name: true,
                image_file_path: true,
                birth_date: true,
                baptism_date: true,
                confirmation_date: true,
                first_profession_date: true,
                final_profession_date: true,
                ordination_date: true,
                personal1_isd: true,
                personal1_contact_no: true,
                watsup1_isd: true,
                watsup1_no: true,
                personal_mailid1: true,
                language_code: true,
                concurrency_val: true,
                created_by: true,
                created_date: true,
                updated_by: true,
                updated_date: true,
            },
        });

        if (!confreres || confreres.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ error: "No confreres found" });
        }

        // Fetch additional member type details and format the response
        const responseResult = await Promise.all(
            confreres.map(async (confrere) => {
                if (!confrere.member_type_code) {
                    console.warn(`Missing member_type_code for confrere: ${confrere.confrer_code}`);
                    // Proceed without member type details
                    return {
                        confrer_code: confrere.confrer_code,
                        confrere_name: `${confrere.first_name || ''} ${confrere.middle_name || ''} ${confrere.last_name || ''}`.trim(),
                        province_code: confrere.province_code,
                        image_file_name: confrere.image_file_name,
                        image_file_path: confrere.image_file_path,
                        birth_date: confrere.birth_date,
                        baptism_date: confrere.baptism_date,
                        confirmation_date: confrere.confirmation_date,
                        first_profession_date: confrere.first_profession_date,
                        final_profession_date: confrere.final_profession_date,
                        ordination_date: confrere.ordination_date,
                        personal1_isd: confrere.personal1_isd,
                        personal1_contact_no: confrere.personal1_contact_no ? confrere.personal1_contact_no.toString() : null,
                        watsup1_isd: confrere.watsup1_isd,
                        watsup1_no: confrere.watsup1_no ? confrere.watsup1_no.toString() : null,
                        personal_mailid1: confrere.personal_mailid1,
                        language_code: confrere.language_code,
                        concurrency_val: confrere.concurrency_val,
                        created_by: confrere.created_by,
                        created_date: confrere.created_date,
                        updated_by: confrere.updated_by,
                        updated_date: confrere.updated_date,
                    };
                }

                // Fetch member type details if member_type_code is present
                const memberType = await prisma.quickcode_mst.findFirst({
                    where: {
                        quick_code: confrere.member_type_code,
                        quick_code_type: "memtyp",
                    },
                    select: { quickcode_name: true },
                });

                const fullName = `${confrere.first_name || ''} ${confrere.middle_name || ''} ${confrere.last_name || ''}`.trim();

                return {
                    confrer_code: confrere.confrer_code,
                    confrere_name: memberType
                        ? `${fullName} [${memberType.quickcode_name}]`
                        : fullName,
                    province_code: confrere.province_code,
                    image_file_name: confrere.image_file_name,
                    image_file_path: confrere.image_file_path,
                    birth_date: confrere.birth_date,
                    baptism_date: confrere.baptism_date,
                    confirmation_date: confrere.confirmation_date,
                    first_profession_date: confrere.first_profession_date,
                    final_profession_date: confrere.final_profession_date,
                    ordination_date: confrere.ordination_date,
                    personal1_isd: confrere.personal1_isd,
                    personal1_contact_no: confrere.personal1_contact_no ? confrere.personal1_contact_no.toString() : null,
                    watsup1_isd: confrere.watsup1_isd,
                    watsup1_no: confrere.watsup1_no ? confrere.watsup1_no.toString() : null,
                    personal_mailid1: confrere.personal_mailid1,
                    language_code: confrere.language_code,
                    concurrency_val: confrere.concurrency_val,
                    created_by: confrere.created_by,
                    created_date: confrere.created_date,
                    updated_by: confrere.updated_by,
                    updated_date: confrere.updated_date,
                };
            })
        );

        res.status(StatusCodes.OK).json(responseResult);
    } catch (error) {
        console.error("Error fetching confreres with details:", error.message);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "An error occurred while fetching confreres with details" });
    } finally {
        await prisma.$disconnect();
    }
};


export const getTransferAppointments = async (req, res) => {
    const { transferType } = req.query;

    // Step 1: Validate transferType
    if (!transferType || !['0', '1'].includes(transferType)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            error: "Valid transfer type (0 for intra, 1 for inter) is required."
        });
    }

    // Step 2: Decode JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            error: "Missing or invalid authorization token"
        });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            error: "Token verification failed"
        });
    }

    const loginProvinceCode = decoded.province_code || decoded.province_name;

    try {
        // ✅ Determine appointments to fetch
        let appointments = [];

        if (transferType === "0") {
            // Intra province: includes misclassified inter transfers from same province
            appointments = await prisma.appoint_transfer_dtl.findMany({
                where: {
                    is_active: true,
                    province_code: loginProvinceCode,
                    inter_province_transfer_chk: { in: [0, 1] },
                    designation_end_date: null
                }
            });
        } else {
            const allInter = await prisma.appoint_transfer_dtl.findMany({
                where: {
                    is_active: true,
                    inter_province_transfer_chk: 1,
                    designation_end_date: null
                }
            });

            const validInter = allInter.filter(app => app.province_code !== loginProvinceCode);

            if (validInter.length === 0) {
                return res.status(StatusCodes.OK).json({
                    message: "All inter-marked appointments belong to your own province. They are treated as intra.",
                    data: []
                });
            }

            appointments = validInter;
        }

        // ✅ Enrich appointments
        const formattedAppointments = await Promise.all(
            appointments.map(async (appointment) => {
                const { confrer_code, centre_code, province_code, division_code, designation_code } = appointment;

                const confrere = await prisma.confreres_dtl.findFirst({
                    where: { confrer_code },
                    select: { first_name: true, middle_name: true, last_name: true },
                });

                const confrere_name = confrere
                    ? `${confrere.first_name} ${confrere.middle_name || ''} ${confrere.last_name}`.trim()
                    : 'N/A';

                const centreDetails = await prisma.centre_dtl.findFirst({
                    where: { centre_code },
                    select: {
                        centre_name: true,
                        centre_place: true,
                        address1: true,
                        address2: true,
                        address3: true,
                    },
                });

                const address = [
                    centreDetails?.address1 || '',
                    centreDetails?.address2 || '',
                    centreDetails?.address3 || '',
                ].filter(Boolean).join(', ');

                const designationDetail = await prisma.quickcode_mst.findFirst({
                    where: { quick_code_type: 'destyp', quick_code: designation_code },
                    select: { quickcode_name: true },
                });

                const province = await prisma.province_mst.findFirst({
                    where: { province_code },
                    select: { province_name: true },
                });

                const division = await prisma.division_setup_mst.findFirst({
                    where: { division_code },
                    select: { division_name: true, division_type_code: true },
                });

                const divisionType = await prisma.quickcode_mst.findFirst({
                    where: { quick_code_type: 'divtyp', quick_code: division?.division_type_code },
                    select: { quickcode_name: true },
                });

                return {
                    ...appointment,
                    confrere_name,
                    centre_place: centreDetails?.centre_place || 'N/A',
                    centre_name: centreDetails?.centre_name || 'N/A',
                    address: address || 'N/A',
                    designation_name: designationDetail?.quickcode_name || 'N/A',
                    province_name: province?.province_name || 'N/A',
                    division_name: division?.division_name || 'N/A',
                    division_type_name: divisionType?.quickcode_name || 'N/A',
                };
            })
        );

        return res.status(StatusCodes.OK).json({
            message:
                formattedAppointments.length === 0
                    ? (transferType === '0'
                        ? "No intra appointment transfers found for your province"
                        : "No inter appointment transfers found from other provinces")
                    : (transferType === '0'
                        ? "Intra appointments found (including wrongly marked inters)"
                        : "Inter appointments from other provinces found."),
            data: formattedAppointments
        });
    } catch (error) {
        console.error("Error fetching appointment transfers:", error.message);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "Internal server error while fetching appointment transfers",
            details: error.message
        });
    } finally {
        await prisma.$disconnect();
    }
};


// Example: GET /getConfrereCodesByProvince/:provinceCode
export const getConfrereCodesByProvince = async (req, res) => {
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
  
      const provinceNameFromToken = decoded.province_name;
      if (!provinceNameFromToken) {
        return res.status(400).json({ error: "Province information is missing in token" });
      }
  
      const { confrer_code } = req.query;
  
      // Fetch supporting data
      const [memberTypes, provinces, nationalities] = await Promise.all([
        prisma.quickcode_mst.findMany({
          where: { quick_code_type: "memtyp" },
          select: { quick_code: true, quickcode_name: true },
        }),
        prisma.province_mst.findMany({
          select: { province_code: true, province_name: true },
        }),
        prisma.quickcode_mst.findMany({
          where: { quick_code_type: "natlty" }, // Adjusted to match the correct type for nationalities
          select: { quick_code: true, quickcode_name: true },
        }),
      ]);
  
      const provincesMap = new Map(provinces.map((p) => [p.province_code, p.province_name]));
      const memberTypesMap = new Map(memberTypes.map((m) => [m.quick_code, m.quickcode_name]));
      const nationalitiesMap = new Map(nationalities.map((n) => [n.quick_code, n.quickcode_name]));
  
      let confreres;
  
      const formatDate = (date) => (date ? new Date(date).toISOString().split("T")[0] : null);
  
      if (confrer_code) {
        // Fetch single confrere by confrer_code
        confreres = await prisma.confreres_dtl.findUnique({ where: { confrer_code } });
  
        if (!confreres) {
          return res.status(404).json({ error: "Confrere not found" });
        }
  
        if (provincesMap.get(confreres.province_code) !== provinceNameFromToken) {
          return res.status(403).json({ error: "You are not authorized to access this confrere's details" });
        }
  
        confreres = {
          ...confreres,
          province_name: provincesMap.get(confreres.province_code) || null,
          member_type_name: memberTypesMap.get(confreres.member_type_code) || null,
          nationality_name: nationalitiesMap.get(confreres.nationality_code) || null, // Corrected mapping
          birth_date: formatDate(confreres.birth_date),
          baptism_date: formatDate(confreres.baptism_date),
          confirmation_date: formatDate(confreres.confirmation_date),
          first_profession_date: formatDate(confreres.first_profession_date),
          final_profession_date: formatDate(confreres.final_profession_date),
          ordination_date: formatDate(confreres.ordination_date),
          created_date: formatDate(confreres.created_date),
          updated_date: formatDate(confreres.updated_date),
        };
      } else {
        // Fetch all confreres
        confreres = await prisma.confreres_dtl.findMany({
          where: { is_active: true },
          orderBy: [
         
            { first_name: 'asc' },
            { middle_name: 'asc' },
            { last_name: 'asc' },
          ],
        });
        confreres = confreres
          .filter((confrere) => provincesMap.get(confrere.province_code) === provinceNameFromToken)
          .map((confrere) => ({
            ...confrere,
            province_name: provincesMap.get(confrere.province_code) || null,
            member_type_name: memberTypesMap.get(confrere.member_type_code) || null,
            nationality_name: nationalitiesMap.get(confrere.nationality_code) || null, // Corrected mapping
            birth_date: formatDate(confrere.birth_date),
            baptism_date: formatDate(confrere.baptism_date),
            confirmation_date: formatDate(confrere.confirmation_date),
            first_profession_date: formatDate(confrere.first_profession_date),
            final_profession_date: formatDate(confrere.final_profession_date),
            ordination_date: formatDate(confrere.ordination_date),
            created_date: formatDate(confrere.created_date),
            updated_date: formatDate(confrere.updated_date),
            personal1_contact_no: confrere.personal1_contact_no?.toString() || null,
            personal2_contact_no: confrere.personal2_contact_no?.toString() || null,
            personal3_contact_no: confrere.personal3_contact_no?.toString() || null,
            watsup1_no: confrere.watsup1_no?.toString() || null,
            watsup2_no: confrere.watsup2_no?.toString() || null,
            watsup3_no: confrere.watsup3_no?.toString() || null,
            emergency_contact_no: confrere.emergency_contact_no?.toString() || null,
          }));
      }
  
      res.status(200).json(confreres);
    } catch (error) {
      console.error("Error fetching confreres:", error.message);
      res.status(500).json({ error: error.message || "An error occurred while fetching confreres" });
    }
  };
  













