import { PrismaClient } from '@prisma/client';
import { HttpException } from '../../exceptions/HttpException.js';
import { logger } from '../../utils/logger.js';
import { StatusCodes } from 'http-status-codes';
import { sendRichEmail } from '../../middlewares/emailService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
path.join(__dirname, '../../middlewares/MSFSLOGO/MSFS.png')
const logoPath = path.join(__dirname, 'MSFSLOGO/MSFS.png');

const prisma = new PrismaClient();

// Function to generate the next announcement_id as a formatted string
const generateNextAnnouncementId = async () => {
    const lastAnnouncement = await prisma.announcements_dtl.findFirst({
        orderBy: {
            anouncement_id: 'desc',
        },
        select: {
            anouncement_id: true,
        },
    });

    let nextAnnouncementId = 1;
    if (lastAnnouncement) {
        const lastAnnouncementIdNumeric = parseInt(lastAnnouncement.anouncement_id.replace('ann', ''), 10);
        nextAnnouncementId = lastAnnouncementIdNumeric + 1;
    }

    return `ann${String(nextAnnouncementId).padStart(3, '0')}`;  // Return as a formatted string 'ann001'
};

// Save announcement function
export const saveAnnouncement = async (req, res) => {
    const {
        province_code,
        division_type_code,
        division_code,
        apostolate_code,
        centre_place_code,
        centre_code,
        member_type_code,
        designation_code,
        anouncement_subjt,
        anouncement_dtl,
        signature_address,
        language_code,
        concurrency_val,
        created_by,
        updated_by,
        updated_date
    } = req.body;

    try {
        console.log('Received data:', req.body);

        // Fetch the province to ensure it's valid
        const province = await prisma.province_mst.findFirst({
            where: {
                province_code: province_code,
            },
        });

        if (!province) {
            console.error(`Province code ${province_code} not found`);
            return res.status(404).json({ error: `Province code ${province_code} not found` });
        }

        // Generate the new announcement_id
        const newAnnouncementId = await generateNextAnnouncementId();

        // Clean up the string inputs to avoid null byte errors
        const cleanedAnnouncementDtl = anouncement_dtl ? anouncement_dtl.replace(/\0/g, '') : null;
        const cleanedSignatureAddress = signature_address ? signature_address.replace(/\0/g, '') : null;

        // Log the lengths of the fields (for debugging potential column length issues)
        console.log('Province Code:', province_code, 'Length:', province_code.length);
        console.log('Division Type Code:', division_type_code, 'Length:', division_type_code ? division_type_code.length : 'null');
        console.log('Apostolate Code:', apostolate_code, 'Length:', apostolate_code ? apostolate_code.length : 'null');
        console.log('Centre Place Code:', centre_place_code, 'Length:', centre_place_code ? centre_place_code.length : 'null');
        console.log('Member Type Code:', member_type_code, 'Length:', member_type_code ? member_type_code.length : 'null');
        console.log('Announcement Subject:', anouncement_subjt, 'Length:', anouncement_subjt ? anouncement_subjt.length : 'null');
        console.log('Announcement Details Length:', cleanedAnnouncementDtl ? cleanedAnnouncementDtl.length : 'null');
        console.log('Signature Address Length:', cleanedSignatureAddress ? cleanedSignatureAddress.length : 'null');

        // Create the announcement
        const result = await prisma.announcements_dtl.create({
            data: {
                anouncement_id: newAnnouncementId,  // Store as formatted string 'ann001'
                province_code: province.province_code,
                division_type_code: division_type_code || null,
                division_code: division_code || null,
                apostolate_code: apostolate_code || null,
                centre_place_code: centre_place_code || null,
                centre_code: centre_code || null,
                member_type_code: member_type_code || null,
                designation_code: designation_code || null,
                anouncement_subjt: anouncement_subjt || null,
                anouncement_dtl: cleanedAnnouncementDtl,
                signature_address: cleanedSignatureAddress,
                language_code: language_code || 'en',  // Default language 'en'
                concurrency_val: concurrency_val || 1,
                created_by: created_by || 'admin',  // Default created_by 'admin'
                created_date: new Date(),
                updated_by: updated_by || null,
                updated_date: updated_date ? new Date(updated_date) : null,  // Set to null if not provided
            },
        });

        console.log('Announcement saved successfully:', result);
        return res.status(201).json({ message: 'Announcement saved successfully', data: result });
    } catch (error) {
        console.error('Error saving announcement:', error.message);

        // Check if error is related to column length exceeding limits
        if (error.message.includes('value for the column is too long')) {
            console.error('One or more fields exceed the allowed column length.');
        }

        return res.status(500).json({ error: 'Internal Server Error' });
    }
};



export const getAllAnnouncements = async (req, res) => {
    try {
        // Fetch all announcements with related data (if any)
        const announcements = await prisma.announcements_dtl.findMany({
            orderBy: {
                created_date: 'asc', // Optional: order by created_date
            },
            select: {
                anouncement_id: true,
                province_code: true,
                division_type_code: true,
                division_code: true,
                apostolate_code: true,
                centre_place_code: true,
                centre_code: true,
                member_type_code: true,
                designation_code: true,
                anouncement_subjt: true,
                anouncement_dtl: true,
                mail_sent: true,
                signature_address: true,
                language_code: true,
                concurrency_val: true,
                created_by: true,
                created_date: true,
                updated_by: true,
                updated_date: true,
                // mail_sent:true,
            },
        });

        if (announcements.length === 0) {
            return res.status(404).json({ message: 'No announcements found' });
        }

        return res.status(200).json({ message: 'Fetched all announcements successfully', data: announcements });
    } catch (error) {
        console.error('Error fetching announcements:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getAnnouncementById = async (req, res) => {
  const { anouncement_id } = req.params;

  try {
    const announcement = await prisma.announcements_dtl.findFirst({
      where: { anouncement_id },
    });

    if (!announcement) {
      return res.status(404).json({ message: `Announcement with ID ${anouncement_id} not found` });
    }

    // Fetch related names from respective tables
    const [
      province,
      divisionType,
      division,
      apostolate,
      centre,
      memberType,
      designation,
      language,
    ] = await Promise.all([
      prisma.province_mst.findFirst({ where: { province_code: announcement.province_code } }),
      prisma.quickcode_mst.findFirst({
        where: { quick_code: announcement.division_type_code, quick_code_type: 'divtyp' },
      }),
      prisma.division_setup_mst.findFirst({ where: { division_code: announcement.division_code } }),
      prisma.quickcode_mst.findFirst({
        where: { quick_code: announcement.apostolate_code, quick_code_type: 'apostl' },
      }),
      prisma.centre_dtl.findFirst({ where: { centre_code: announcement.centre_code } }),
      prisma.quickcode_mst.findFirst({
        where: { quick_code: announcement.member_type_code, quick_code_type: 'memtyp' },
      }),
      prisma.quickcode_mst.findFirst({
        where: { quick_code: announcement.designation_code, quick_code_type: 'destyp' },
      }),
      prisma.languagemetadata.findFirst({
        where: { language_code: announcement.language_code },
      }),
      
    ]);

    // Return full enriched announcement data
    return res.status(200).json({
      message: 'Announcement fetched successfully',
      data: {
        ...announcement,
        province_name: province?.province_name || '',
        division_type_name: divisionType?.quickcode_name || '',
        division_name: division?.division_name || '',
        apostolate_name: apostolate?.quickcode_name || '',
        centre_name: centre?.centre_name || '',
        member_type_name: memberType?.quickcode_name || '',
        designation_name: designation?.quickcode_name || '',
        language_name: language?.language_name || '',
      },
    });
  } catch (error) {
    console.error(`Error fetching announcement with ID ${anouncement_id}:`, error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};


export const updateAnnouncement = async (req, res) => {
    const { anouncement_id } = req.params;  // Extract anouncement_id from the request parameters
    const {
        province_code,
        division_type_code,
        division_code,
        apostolate_code,
        centre_place_code,
        centre_code,
        member_type_code,
        designation_code,
        anouncement_subjt,
        anouncement_dtl,
        signature_address,
        language_code,
        concurrency_val,
        updated_by,
        updated_date
    } = req.body;  // Extract the new values from the request body

    try {
        // Check if the announcement exists
        const existingAnnouncement = await prisma.announcements_dtl.findUnique({
            where: { anouncement_id },
        });

        if (!existingAnnouncement) {
            return res.status(404).json({ message: `Announcement with ID ${anouncement_id} not found` });
        }

        // Update the announcement with the new data
        const updatedAnnouncement = await prisma.announcements_dtl.update({
            where: { anouncement_id },
            data: {
                province_code: province_code || existingAnnouncement.province_code,
                division_type_code: division_type_code || existingAnnouncement.division_type_code,
                division_code: division_code || existingAnnouncement.division_code,
                apostolate_code: apostolate_code || existingAnnouncement.apostolate_code,
                centre_place_code: centre_place_code || existingAnnouncement.centre_place_code,
                centre_code: centre_code || existingAnnouncement.centre_code,
                member_type_code: member_type_code || existingAnnouncement.member_type_code,
                designation_code: designation_code || existingAnnouncement.designation_code,
                anouncement_subjt: anouncement_subjt || existingAnnouncement.anouncement_subjt,
                anouncement_dtl: anouncement_dtl || existingAnnouncement.anouncement_dtl,
                signature_address: signature_address || existingAnnouncement.signature_address,
                language_code: language_code || existingAnnouncement.language_code,
                concurrency_val: concurrency_val || existingAnnouncement.concurrency_val,
                updated_by: updated_by || 'admin',  // Set default value if not provided
                updated_date: updated_date ? new Date(updated_date) : new Date(),  // Set current date if not provided
            },
        });

        return res.status(200).json({ message: 'Announcement updated successfully', data: updatedAnnouncement });
    } catch (error) {
        console.error(`Error updating announcement with ID ${anouncement_id}:`, error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteAnnouncement = async (req, res) => {
  const { anouncement_id } = req.params;  // Extract anouncement_id from the request parameters

  try {
      // Find the announcement using findFirst() instead of findUnique()
      const existingAnnouncement = await prisma.announcements_dtl.findFirst({
          where: { anouncement_id },
      });

      if (!existingAnnouncement) {
          return res.status(404).json({ message: `Announcement with ID  not found` });
      }

      // Delete the announcement
      await prisma.announcements_dtl.delete({
          where: { 
              anouncement_id_province_code: {  // Use composite key
                  anouncement_id: anouncement_id,
                  province_code: existingAnnouncement.province_code, // Get from the found record
              }
          }
      });

      return res.status(200).json({ message: `Announcement with ID  deleted successfully` });
  } catch (error) {
      console.error(`Error deleting announcement with ID ${anouncement_id}:`, error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
};



export const updateNewsAnnouncement = async (req, res) => {
    const {
      province_code,
      division_type_code,
      division_code,
      apostolate_code,
      centre_place_code,
      centre_code,
      member_type_code,
      designation_code,
      anouncement_subjt,  // Assuming subject is unique
      anouncement_dtl,
      signature_address,
      language_code,
      concurrency_val,
      updated_by,
      updated_date
    } = req.body;
  
    try {
      // Find the announcement using the subject or other unique fields
      const existingAnnouncement = await prisma.announcements_dtl.findUnique({
        where: { anouncement_subjt },  // Assuming subject is unique
      });
  
      if (!existingAnnouncement) {
        return res.status(404).json({ message: `Announcement with subject "${anouncement_subjt}" not found` });
      }
  
      // Update the announcement
      const updatedAnnouncement = await prisma.announcements_dtl.update({
        where: { anouncement_subjt },
        data: {
          province_code,
          division_type_code,
          division_code,
          apostolate_code,
          centre_place_code,
          centre_code,
          member_type_code,
          designation_code,
          anouncement_dtl,
          signature_address,
          language_code,
          concurrency_val,
          updated_by: updated_by || 'admin',  // Default to admin if not provided
          updated_date: updated_date ? new Date(updated_date) : new Date(),  // Set current date if not provided
        },
      });
  
      return res.status(200).json({ message: 'Announcement updated successfully', data: updatedAnnouncement });
    } catch (error) {
      console.error(`Error updating announcement:`, error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };




export const getDetailsByProvinceAndDivision = async (provinceCode) => {
  try {
    if (!provinceCode) {
      logger.error('Province code is required');
      throw new HttpException(StatusCodes.BAD_REQUEST, 'Province code is required');
    }

    logger.info(`Fetching details for provinceCode: ${provinceCode}`);

    // Check if provinceCode is ALL
    const isAllProvinces = provinceCode === 'ALL';

    // Fetch divisions
    const divisions = await prisma.division_setup_mst.findMany({
      where: isAllProvinces ? {} : { province_code: provinceCode },
      select: {
        division_type_code: true,
        division_code: true,
        division_name: true,
      },
      orderBy: {
        division_name: "asc", // Change this if another field defines the order
      },
    });

    // Fetch division type names from quickcode_mst
    const divisionTypeCodes = divisions.map((division) => division.division_type_code);
    const divisionTypeNames = await prisma.quickcode_mst.findMany({
      where: {
        quick_code: { in: divisionTypeCodes },
        quick_code_type: 'divtyp',
      },
      select: {
        quick_code: true,
        quickcode_name: true,
      },
      orderBy: {
        quickcode_name: "asc", // Change this if another field defines the order
      },
    });

    // Map division_type_name to divisions
    const formattedDivisions = divisions.map((division) => {
      const typeName = divisionTypeNames.find(
        (type) => type.quick_code === division.division_type_code
      );
      return {
        ...division,
        division_type_name: typeName ? typeName.quickcode_name : null,
      };
    });

    logger.info(`Fetched ${formattedDivisions.length} divisions`);

    // Other fetch operations (memberTypes, apostolates, etc.)
    // Fetch member types
    const memberTypeCodes = await prisma.confreres_dtl.findMany({
      where: isAllProvinces ? {} : { province_code: provinceCode },
      distinct: ['member_type_code'],
      select: {
        member_type_code: true,
      },
    });
    const memberTypes = await prisma.quickcode_mst.findMany({
      where: {
        quick_code: {
          in: memberTypeCodes.map((type) => type.member_type_code).filter((code) => code !== null),
        },
        quick_code_type: 'memtyp',
      },
      select: {
        quick_code: true,
        quickcode_name: true,
      },
      orderBy: {
        quickcode_name: "asc", // Change this if another field defines the order
      },
    });
    logger.info(`Fetched ${memberTypes.length} member types`);

    // Fetch apostolates
    const apostolates = await prisma.quickcode_mst.findMany({
      where: { quick_code_type: 'apostl', ...(isAllProvinces ? {} : { province_code: provinceCode }) },
      select: {
        quick_code: true,
        quickcode_name: true,
      },
      orderBy: {
        quickcode_name: "asc", // Change this if another field defines the order
      },
    });
    logger.info(`Fetched ${apostolates.length} apostolates`);

    // Fetch centre details (all data if provinceCode is ALL)
    const centreDetails = await prisma.centre_dtl.findMany({
      where: isAllProvinces ? {} : { province_code: provinceCode },
      select: {
        centre_name: true,
        centre_place: true,
        office_mailid1: true,
        office_mailid2: true,
        office_mailid3: true,
      },
      orderBy: {
        centre_name: "asc", 
      },
      orderBy: {
        centre_place: "asc", 
      },
      
    });
    logger.info(`Fetched ${centreDetails.length} centres`);

    // Fetch designations
    const designations = await prisma.quickcode_mst.findMany({
      where: { quick_code_type: 'destyp', ...(isAllProvinces ? {} : { province_code: provinceCode }) },
      select: {
        quick_code: true,
        quickcode_name: true,
      },
      orderBy: {
        quickcode_name: "asc", // Change this if another field defines the order
      },
    });
    logger.info(`Fetched ${designations.length} designations`);

    // Fetch province email IDs (all if provinceCode is ALL)
    const provinceEmails = isAllProvinces
      ? await prisma.province_mst.findMany({
          select: {
            email: true,
          },
        })
      : await prisma.province_mst.findUnique({
          where: { province_code: provinceCode },
          select: {
            email: true,
          },
        });
    const provinceEmailList = isAllProvinces
      ? provinceEmails.map((province) => province.email)
      : [provinceEmails?.email || null];
    logger.info(`Fetched province emails: ${provinceEmailList.length}`);

    // Fetch confreres email IDs (all if provinceCode is ALL)
    const confreresEmails = await prisma.confreres_dtl.findMany({
      where: isAllProvinces ? {} : { province_code: provinceCode },
      select: {
        personal_mailid1: true,
      },
    });
    const confreresEmailList = confreresEmails.map((email) => email.personal_mailid1);
    logger.info(`Fetched ${confreresEmailList.length} confreres email IDs`);

    // Combine all results
    const result = {
      memberTypes,
      apostolates,
      centres: centreDetails,
      designations,
      divisions: formattedDivisions,
      emails: {
        provinceEmailList,
        confreresEmailList,
      },
    };

    logger.info('Successfully fetched all required details');
    return result;
  } catch (error) {
    logger.error(`Error fetching details: ${error.message}`);
    throw new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch details');
  } finally {
    await prisma.$disconnect();
  }
};


const generateAnouncementId = async () => {
  // Fetch the last anouncement_id from the database
  const lastAnnouncement = await prisma.announcements_dtl.findFirst({
    orderBy: { anouncement_id: 'desc' }, // Get the latest by ID
  });

  // Extract the numeric part and increment it
  const lastIdNumber = lastAnnouncement
    ? parseInt(lastAnnouncement.anouncement_id.replace('AN', ''), 10)
    : 0;

  // Generate the new ID
  const newIdNumber = lastIdNumber + 1;
  return `AN${String(newIdNumber).padStart(3, '0')}`; // e.g., AN001
};


export const saveAnnouncementAndSendEmail = async (req, res) => {
  const {
    province_code,
    division_type_code,
    division_code,
    apostolate_code,
    centre_place_code,
    centre_code,
    centre_name,
    member_type_code,
    designation_code,
    anouncement_subjt,
    anouncement_dtl,
    signature_address,
    language_code,
    created_by,
    sendMail,
  } = req.body;

  try {
    if (!province_code || !anouncement_subjt ) {
      throw new Error('Missing required fields. Please ensure all mandatory fields are filled.');
    }

    // If only centre_name is passed, resolve the centre_code from the table
    let resolved_centre_code = centre_code;
    if (!centre_code && centre_name) {
      const centreRecord = await prisma.centre_dtl.findFirst({
        where: {
          centre_name: centre_name.trim(), // trim for safety
        },
        select: {
          centre_code: true,
        },
      });
    
      if (!centreRecord) {
        throw new Error(`Centre with name "${centre_name}" not found.`);
      }
    
      resolved_centre_code = centreRecord.centre_code;
    }
    

    const anouncement_id = await generateAnouncementId();

    const newAnnouncement = await prisma.announcements_dtl.create({
      data: {
        anouncement_id,
        province_code,
        division_type_code: division_type_code || null,
        division_code: division_code || null,
        apostolate_code: apostolate_code || null,
        centre_place_code: centre_place_code || null,
        centre_code: resolved_centre_code || null,
        member_type_code: member_type_code || null,
        designation_code: designation_code || null,
        anouncement_subjt,
        anouncement_dtl,
        signature_address,
        language_code: language_code || null,
        created_by,
        created_date: new Date(),
        updated_by: null,
        updated_date: null,
        mail_sent: sendMail || false,
      },
    });

    console.log('✅ Announcement saved successfully:', newAnnouncement);

    // ✅ START: send email only if sendMail is true
    if (sendMail === true) {
      const details = await getDetailsByProvinceAndDivision(province_code);
      const { emails, centres } = details;

      const centreEmails = centres.flatMap((centre) =>
        [centre.office_mailid1, centre.office_mailid2, centre.office_mailid3].filter(Boolean)
      );

      const recipientEmails = [
        ...(emails.provinceEmailList || []),
        ...(emails.confreresEmailList || []),
        ...centreEmails,
      ].filter(Boolean);

      if (recipientEmails.length === 0) {
        return res.status(400).json({ message: 'No recipients found for the selected province.' });
      }

      const logoUrl = 'http://localhost:5000/assets/MSFS.png'; 
       const emailText = `
           <div style="max-width:600px;margin:auto;border:1px solid #ddd;border-radius:10px;font-family:Arial,sans-serif;">
             <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#008B94;border-top-left-radius:10px;border-top-right-radius:10px;">
               <tr>
                 <td style="padding:15px;text-align:center;color:white;font-size:22px;font-weight:bold;">
                   ANNOUNCEMENTS
                 </td>
                 <td style="padding:10px;width:100px;text-align:center;background-color:#f2f2f2;border-top-right-radius:10px;">
                   <img src="${logoUrl}" alt="MSFS Logo" style="height:50px;" />
                 </td>
               </tr>
             </table>
         
             <div style="padding:25px;">
               <p style="margin:12px 0;"><strong style="color:#006666;">SUBJECT</strong><br/>${anouncement_subjt || 'N/A'}</p>
               <p style="margin:12px 0;"><strong style="color:#006666;">DETAILS</strong><br/>${anouncement_dtl || 'N/A'}</p>
               <p style="margin:12px 0;"><strong style="color:#006666;">SIGNATURE</strong><br/>${signature_address || 'N/A'}</p>
               <br/>
               <p style="margin-top:25px;">Regards,<br/>${created_by || 'Admin'}</p>
             </div>
           </div>
         `;
         
     
           console.log('📨 Sending to:', recipientEmails);
           await sendRichEmail({
             to: recipientEmails,
             subject: anouncement_subjt,
             html: emailText,
            
           });

      await prisma.announcements_dtl.update({
        where: {
          anouncement_id_province_code: {
            anouncement_id,
            province_code,
          },
        },
        data: { mail_sent: true },
      });

      console.log('✅ Email sent successfully.');
    }
    // ✅ END if sendMail

    res.status(200).json({
      message: sendMail
        ? 'Announcement saved and email sent successfully.'
        : 'Announcement saved successfully.',
      data: newAnnouncement,
    });
  } catch (error) {
    console.error('❌ Error in saveAnnouncementAndSendEmail:', error.message);
    res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
};




export const sendAnnouncementMail = async (req, res) => {
  console.log('Received request to send mail for announcement:', req.body);

  try {
    // Extract anouncement_id from the request body
    const { anouncement_id } = req.body; // Corrected variable name

    if (!anouncement_id) { // Corrected variable name
      console.error("Announcement ID is missing in the request");
      return res.status(400).json({ error: "Announcement ID is missing in the request" });
    }

    // Fetch the announcement details
    const announcement = await prisma.announcements_dtl.findFirst({
      where: {
        anouncement_id: anouncement_id, // Corrected variable name
      },
    });

    if (!announcement) {
      console.error("Announcement not found");
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    // Fetch email recipients
    const emailRecipients = await prisma.$queryRaw`
      SELECT DISTINCT personal_mailid1 AS email FROM confreres_dtl WHERE province_code = ${announcement.province_code}
      UNION
      SELECT DISTINCT office_mailid1 AS email FROM curia_advisors_dtl WHERE province_code = ${announcement.province_code}
      UNION
      SELECT DISTINCT office_mailid1 AS email FROM centre_dtl WHERE province_code = ${announcement.province_code}
    `;

    const recipientEmails = emailRecipients.map((row) => row.email).filter((email) => email && email.includes('@'));

    if (recipientEmails.length === 0) {
      console.error('No valid recipients found for province:', announcement.province_code);
      return res.status(400).json({ error: 'No valid recipients found to send emails.' });
    }
const logoUrl = 'http://localhost:5000/assets/MSFS.png'; 
    // Compose the email content
    const emailContent = `
      <div style="max-width:600px;margin:auto;border:1px solid #ddd;border-radius:10px;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#008B94;border-top-left-radius:10px;border-top-right-radius:10px;">
          <tr>
            <td style="padding:15px;text-align:center;color:white;font-size:22px;font-weight:bold;">
              ANNOUNCEMENTS
            </td>
            <td style="padding:10px;width:100px;text-align:center;background-color:#f2f2f2;border-top-right-radius:10px;">
              <img src="${logoUrl}" alt="MSFS Logo" style="height:50px;" />
            </td>
          </tr>
        </table>

        <div style="padding:25px;">
          <p style="margin:12px 0;"><strong style="color:#006666;">SUBJECT</strong><br/>${announcement.anouncement_subjt || 'N/A'}</p>
          <p style="margin:12px 0;"><strong style="color:#006666;">DETAILS</strong><br/>${announcement.anouncement_dtl || 'N/A'}</p>
          <p style="margin:12px 0;"><strong style="color:#006666;">SIGNATURE</strong><br/>${announcement.signature_address || 'N/A'}</p>
          <br/>
          <p style="margin-top:25px;">Regards,<br/>Admin Team</p>
        </div>
      </div>
    `;

    // Send the email
    try {
      await sendRichEmail({
        to: recipientEmails,
        subject: `Announcement: ${announcement.anouncement_subjt}`,
        text: 'Announcement details have been shared.',
        html: emailContent,
        
      });
      console.log('Emails sent successfully to:', recipientEmails);

      await prisma.announcements_dtl.update({
        where: {
            anouncement_id_province_code: {
                anouncement_id: announcement.anouncement_id,
                province_code: announcement.province_code,
            },
        },
        data: { mail_sent: true },
    });

      return res.status(200).json({ message: 'Emails sent successfully' });

    } catch (emailError) {
      console.error('Error sending email:', emailError);
      return res.status(500).json({ error: 'Failed to send emails.' });
    }
  } catch (error) {
    console.error('Error in sendAnnouncementMail:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};