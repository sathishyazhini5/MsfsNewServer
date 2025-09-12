import { sendEmail } from '../../middlewares/emailService.js';
import { PrismaClient } from '@prisma/client';
import { HttpException } from '../../exceptions/HttpException.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../utils/logger.js';
const prisma = new PrismaClient();

// export const sendAnniversaryEmails = async (req, res, next) => {
//     try {
//         // Fetch pending notifications
//         const notifications = await prisma.anniversary_notify_dtl.findMany({
//             where: { notify_sent_date: null },
//         });

//         if (!notifications.length) {
//             return res.status(200).json({ message: 'No pending notifications found.' });
//         }

//         const results = [];

//         for (const notification of notifications) {
//             try {
//                 // Check if email exists
//                 if (!notification.emailid) {
//                     results.push({
//                         notify_id: notification.notify_id,
//                         status: 'Failed',
//                         error: 'Missing email ID',
//                     });
//                     continue;
//                 }

//                 // Prepare email content
//                 const subject = 'Happy Anniversary!';
//                 const text = `Dear Member,\n\nWishing you a very happy ${notification.anniversary_type_code} on ${notification.anniversary_date.toDateString()}!`;

//                 // Send email
//                 const emailResult = await sendEmail(notification.emailid, subject, text);

//                 if (emailResult.success) {
//                     // Update notify_sent_date in the database
//                     await prisma.anniversary_notify_dtl.update({
//                         where: { notify_id: notification.notify_id },
//                         data: { notify_sent_date: new Date() },
//                     });

//                     results.push({
//                         notify_id: notification.notify_id,
//                         status: 'Sent',
//                     });
//                 } else {
//                     results.push({
//                         notify_id: notification.notify_id,
//                         status: 'Failed',
//                         error: emailResult.error,
//                     });
//                 }
//             } catch (error) {
//                 results.push({
//                     notify_id: notification.notify_id,
//                     status: 'Failed',
//                     error: error.message,
//                 });
//             }
//         }

//         res.status(200).json({
//             message: 'Anniversary notifications processed.',
//             results,
//         });
//     } catch (error) {
//         console.error('Error processing anniversary emails:', error.message);
//         next(new Error('Failed to process anniversary notifications.'));
//     }
// };




import { Prisma } from '@prisma/client';

export const getTodayAnniversaries = async (req, res, next) => {
  try {
    const { date, type, fullDate } = req.query;

    const inputDate = fullDate ? new Date(fullDate) : (date ? new Date(date) : new Date());

    const matchFullDate = !!fullDate;
    const formattedFullDate = inputDate.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const formattedMonthDay = `${String(inputDate.getMonth() + 1).padStart(2, '0')}-${String(inputDate.getDate()).padStart(2, '0')}`; // 'MM-DD'

    console.log('Query Type:', matchFullDate ? 'FULL DATE' : 'MM-DD');
    console.log('Looking for:', matchFullDate ? formattedFullDate : formattedMonthDay);

    // Removed type filtering from SQL — will handle it in JS
    const typeCondition = Prisma.empty;

    const buildQuery = (tableName, codeField) => Prisma.sql`
      SELECT 
        ${codeField} AS id,
        '${tableName}' AS type,
        first_name,
        last_name,
        personal_mailid1 AS emailid,
        personal1_contact_no AS contact_no,
        CASE
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(birth_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(birth_date, 'MM-DD') = ${formattedMonthDay}`} THEN 'Birthday'
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(baptism_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(baptism_date, 'MM-DD') = ${formattedMonthDay}`} THEN 'Baptism'
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(confirmation_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(confirmation_date, 'MM-DD') = ${formattedMonthDay}`} THEN 'Confirmation'
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(first_profession_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(first_profession_date, 'MM-DD') = ${formattedMonthDay}`} THEN 'First Profession'
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(final_profession_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(final_profession_date, 'MM-DD') = ${formattedMonthDay}`} THEN 'Final Profession'
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(ordination_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(ordination_date, 'MM-DD') = ${formattedMonthDay}`} THEN 'Ordination'
        END AS anniversary_type,
        CASE
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(birth_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(birth_date, 'MM-DD') = ${formattedMonthDay}`} THEN birth_date
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(baptism_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(baptism_date, 'MM-DD') = ${formattedMonthDay}`} THEN baptism_date
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(confirmation_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(confirmation_date, 'MM-DD') = ${formattedMonthDay}`} THEN confirmation_date
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(first_profession_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(first_profession_date, 'MM-DD') = ${formattedMonthDay}`} THEN first_profession_date
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(final_profession_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(final_profession_date, 'MM-DD') = ${formattedMonthDay}`} THEN final_profession_date
          WHEN ${matchFullDate ? Prisma.sql`TO_CHAR(ordination_date, 'YYYY-MM-DD') = ${formattedFullDate}` : Prisma.sql`TO_CHAR(ordination_date, 'MM-DD') = ${formattedMonthDay}`} THEN ordination_date
        END AS anniversary_date
      FROM ${Prisma.raw(tableName)}
      WHERE (
        ${matchFullDate
        ? Prisma.sql`
            TO_CHAR(birth_date, 'YYYY-MM-DD') = ${formattedFullDate} OR
            TO_CHAR(baptism_date, 'YYYY-MM-DD') = ${formattedFullDate} OR
            TO_CHAR(confirmation_date, 'YYYY-MM-DD') = ${formattedFullDate} OR
            TO_CHAR(first_profession_date, 'YYYY-MM-DD') = ${formattedFullDate} OR
            TO_CHAR(final_profession_date, 'YYYY-MM-DD') = ${formattedFullDate} OR
            TO_CHAR(ordination_date, 'YYYY-MM-DD') = ${formattedFullDate}`
        : Prisma.sql`
            TO_CHAR(birth_date, 'MM-DD') = ${formattedMonthDay} OR
            TO_CHAR(baptism_date, 'MM-DD') = ${formattedMonthDay} OR
            TO_CHAR(confirmation_date, 'MM-DD') = ${formattedMonthDay} OR
            TO_CHAR(first_profession_date, 'MM-DD') = ${formattedMonthDay} OR
            TO_CHAR(final_profession_date, 'MM-DD') = ${formattedMonthDay} OR
            TO_CHAR(ordination_date, 'MM-DD') = ${formattedMonthDay}`
      }
      )
      ${typeCondition}
    `;

    const [confreres, scholastics] = await Promise.all([
      prisma.$queryRaw(buildQuery('confreres_dtl', Prisma.sql`confrer_code`)),
      prisma.$queryRaw(buildQuery('scholastics_dtl', Prisma.sql`scholastic_code`)),
    ]);

    const anniversaries = [
      ...confreres,
      ...scholastics,
    ].map((record) => ({
      ...record,
      full_name: `${record.first_name || ''} ${record.last_name || ''}`.trim(),
      anniversary_date: new Date(record.anniversary_date).toLocaleDateString('en-GB'),
      contact_no: record.contact_no?.toString() || null,
    }));

    // ✅ NEW: Apply anniversary_type filter after query
    const filteredAnniversaries = type
      ? anniversaries.filter((a) => a.anniversary_type === type)
      : anniversaries;

    if (filteredAnniversaries.length === 0) {
      return res.status(404).json({ message: 'No anniversaries found for the selected date and type.' });
    }

    res.status(200).json(filteredAnniversaries);
  } catch (error) {
    console.error('Error fetching anniversaries:', error.message);
    next(new Error('Failed to fetch anniversary data.'));
  }
};

export const sendTodayAnniversaries = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format

    // Fetch data from confreres_dtl
    const confreres = await prisma.$queryRaw`
            SELECT 
                'confrere' AS type,
                confrer_code AS id,
                first_name,
                middle_name,
                last_name,
                personal_mailid1 AS emailid,
                personal1_contact_no AS contact_no,
                CASE
                    WHEN birth_date = ${today} THEN 'Birthday'
                    WHEN baptism_date = ${today} THEN 'Baptism'
                    WHEN confirmation_date = ${today} THEN 'Confirmation'
                    WHEN first_profession_date = ${today} THEN 'First Profession'
                    WHEN final_profession_date = ${today} THEN 'Final Profession'
                    WHEN ordination_date = ${today} THEN 'Ordination'
                END AS anniversary_type
            FROM confreres_dtl
            WHERE 
                birth_date = ${today}
                OR baptism_date = ${today}
                OR confirmation_date = ${today}
                OR first_profession_date = ${today}
                OR final_profession_date = ${today}
                OR ordination_date = ${today};
        `;

    // Fetch data from scholastics_dtl
    const scholastics = await prisma.$queryRaw`
            SELECT 
                'scholastic' AS type,
                scholastic_code AS id,
                first_name,
                middle_name,
                last_name,
                personal_mailid1 AS emailid,
                personal1_contact_no AS contact_no,
                CASE
                    WHEN birth_date = ${today} THEN 'Birthday'
                    WHEN baptism_date = ${today} THEN 'Baptism'
                    WHEN confirmation_date = ${today} THEN 'Confirmation'
                    WHEN first_profession_date = ${today} THEN 'First Profession'
                    WHEN final_profession_date = ${today} THEN 'Final Profession'
                    WHEN ordination_date = ${today} THEN 'Ordination'
                END AS anniversary_type
            FROM scholastics_dtl
            WHERE 
                birth_date = ${today}
                OR baptism_date = ${today}
                OR confirmation_date = ${today}
                OR first_profession_date = ${today}
                OR final_profession_date = ${today}
                OR ordination_date = ${today};
        `;

    const anniversaryList = [...confreres, ...scholastics].filter(item => item.anniversary_type);

    if (anniversaryList.length === 0) {
      if (res) {
        return res.status(404).json({ message: 'No anniversaries found for today.' });
      }
      console.log('No anniversaries found for today.');
      return;
    }

    // Send notifications
    for (const anniversary of anniversaryList) {
      const { type, id, first_name, middle_name, last_name, emailid, contact_no, anniversary_type } = anniversary;

      const fullName = `${first_name} ${middle_name || ''} ${last_name}`.trim();
      const subject = `Happy ${anniversary_type}! 🎉`;
      const message = `
                Dear ${fullName},

                We wish you a very Happy ${anniversary_type}! May your day be filled with joy and blessings.

                Best regards,
                Your Team
            `;

      // Send Email
      if (emailid) {
        await sendEmail(emailid, subject, message);
        console.log(`Email sent to ${emailid}`);
      }

      // Send SMS (Optional)
      if (contact_no) {
        console.log(`SMS sent to ${contact_no}: ${message}`);
      }
    }

    if (res) {
      return res.status(200).json({ message: 'Anniversary notifications sent successfully.' });
    }
    console.log('All anniversary emails sent successfully.');
  } catch (error) {
    console.error('Error sending anniversary notifications:', error.message);
    if (res) {
      return next(new Error('Failed to send anniversary notifications.'));
    }
  } finally {
    await prisma.$disconnect();
  }
};

export const sendAnniversaryEmails = async (data) => {
  try {
    console.log('Processing data:', data); // Debugging input data

    if (!Array.isArray(data)) {
      throw new Error('Input data must be an array.');
    }

    for (const record of data) {
      const { emailid, first_name, last_name, anniversary_type } = record;

      if (!emailid || !first_name || !anniversary_type) {
        console.error(`Invalid record: ${JSON.stringify(record)}`);
        continue; // Skip invalid records
      }

      const subject = `Happy ${anniversary_type}, ${first_name}!`;
      const body = `Dear ${first_name} ${last_name || ''},\n\n` +
        `Warm wishes on your ${anniversary_type}! Have a joyful and blessed day.\n\n` +
        `Best regards,\nYour Team`;

      await sendEmail(emailid, subject, body);
      console.log(`Email sent to ${emailid}`);
    }
  } catch (error) {
    console.error('Error sending emails:', error.message);
    throw new Error('Failed to send anniversary emails.');
  }
};


export const sendAnniversaryEmail = async (req, res, next) => {
  try {
    console.log("REQ BODY DEBUG:", req.body);

    const {
      language,
      emailsubject,
      emailmessage,
      confrer_code,
      scholastic_code,
    } = req.body;

    if (!language || !emailsubject || !emailmessage) {
      throw new HttpException(StatusCodes.BAD_REQUEST, 'Required fields are missing');
    }

    let confrereRecipients = [], scholasticRecipients = [];

    if (Array.isArray(confrer_code) && confrer_code.length > 0) {
      confrereRecipients = await prisma.confreres_dtl.findMany({
        where: { confrer_code: { in: confrer_code } },
        select: { personal_mailid1: true, first_name: true },
      });
    }

    if (Array.isArray(scholastic_code) && scholastic_code.length > 0) {
      scholasticRecipients = await prisma.scholastics_dtl.findMany({
        where: { scholastic_code: { in: scholastic_code } },
        select: { personal_mailid1: true, first_name: true },
      });
    }

    const recipients = [...confrereRecipients, ...scholasticRecipients];

    if (!recipients.length) {
      throw new HttpException(StatusCodes.NOT_FOUND, 'No matching records found');
    }

    const results = [];

    for (const person of recipients) {
      if (!person.personal_mailid1) continue;

      try {
        await sendEmail(
          person.personal_mailid1,
          emailsubject,
          emailmessage,
          person.first_name || 'Member'
        );
        results.push({ email: person.personal_mailid1, status: 'Sent' });
      } catch (err) {
        results.push({
          email: person.personal_mailid1,
          status: 'Failed',
          error: err.message,
        });
      }
    }

    if (results.length === 0) {
      throw new HttpException(StatusCodes.NOT_FOUND, 'No valid email addresses found');
    }

    res.status(StatusCodes.OK).json({
      message: 'Emails processed',
      results,
    });
  } catch (error) {
    console.error('Unhandled Error:', error);
    next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, error.message));
  }
};



