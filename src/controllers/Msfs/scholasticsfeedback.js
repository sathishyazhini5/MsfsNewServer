import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import jwt from "jsonwebtoken";
import { log } from 'console';
import { JWT_SECRET } from "../../config/index.js";
import { uploadBufferToBlob } from '../../middlewares/azureBlob.js'; 

const prisma = new PrismaClient();

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Specify the uploads directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Save file with timestamp to avoid name conflicts
    }
});

const upload = multer({ storage: storage }).single('uploaded_file'); // Use .single to accept one file

// Helper function to get the next scholastic feedback code
async function getNextScholasticFeedbackCode() {
    const lastFeedback = await prisma.scholastics_feedback_dtl.findFirst({
        orderBy: { scholastic_feedback_code: 'desc' },
        take: 1
    });

    if (!lastFeedback) return 'SFE001'; // Default starting code if no feedback exists

    const lastCode = lastFeedback.scholastic_feedback_code;
    const numericPart = parseInt(lastCode.slice(4)); // Extract numeric part
    const nextCode = `SFE${String(numericPart + 1).padStart(3, '0')}`; // Increment and format with leading zeros
    return nextCode;
}

export const createScholasticFeedback = async (req, res) => {
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
  
        // Extract `province_name` and `created_by` from the decoded token
        const provinceName = decoded.province_name;
        const createdBy = decoded.role_name || decoded.username || "Unknown";
  
        // Fetch `province_code` based on `province_name`
        const province = await prisma.province_mst.findFirst({
          where: { province_name: provinceName },
          select: { province_code: true },
        });
  
        if (!province) {
          return res.status(404).json({ error: "Province not found for the given name" });
        }
  
        const province_code = province.province_code;
        const {
            scholastic_code,
            feedback_date,
            title_subject,
            comment,
            signature,
            academic_details
        } = req.body;

        console.log(req.body);

        // Validate required fields
        if (
            !scholastic_code ||
            !feedback_date ||
            !title_subject ||
            !comment ||
            !signature ||
            !province_code ||
            !academic_details
        ) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Split academic_details into scholastic_type_code and academic_year
        let [scholastic_type_code, academic_year] = academic_details.split(' - ');

        // Trim the values to remove any leading or trailing spaces
        scholastic_type_code = scholastic_type_code.trim();
        academic_year = academic_year.trim();

        console.log(`scholastic_type_code: ${scholastic_type_code}, academic_year: ${academic_year}`);

        if (!scholastic_type_code || !academic_year) {
            return res.status(400).json({ message: 'Invalid academic_details format. Expected format: "TYPE001 - 2024-2025".' });
        }

        // Fetch the correct quickcode from the quickcode_mst table
        const quickcodeData = await prisma.quickcode_mst.findFirst({
            where: {
                quick_code_type: 'schtyp',
                quickcode_name: scholastic_type_code
            },
            select: { quick_code: true, quickcode_name: true }
        });

        if (!quickcodeData) {
            return res.status(404).json({ message: `Scholastic type "${scholastic_type_code}" not found in the quickcode_mst table.` });
        }

        const quickcode_name = quickcodeData.quickcode_name;
        const quick_code = quickcodeData.quick_code;

        console.log(`Found quickcode: ${quick_code}, name: ${quickcode_name}`);

        // Fetch scholastic details from the database
        const scholasticDetails = await prisma.scholastics_admisn_promon_dtl.findMany({
            where: { scholastic_code },
            select: { scholastic_type_code: true, academic_year: true, province_code: true }
        });

        console.log('Fetched scholasticDetails from database:', scholasticDetails);

        if (!scholasticDetails.length) {
            return res.status(404).json({ message: 'Scholastic details not found for the provided code.' });
        }

        // Validate scholastic_type_code and academic_year using quick_code
        const validScholastic = scholasticDetails.some(
            (detail) =>
                detail.scholastic_type_code === quick_code && // Compare with quick_code now
                detail.academic_year === academic_year &&
                detail.province_code === province_code
        );

        if (!validScholastic) {
            return res.status(400).json({
                message: `Invalid scholastic type code or academic year for the provided scholastic code. Available scholastic type codes are: ${scholasticDetails.map(detail => detail.scholastic_type_code).join(', ')}`
            });
        }

        // Generate next scholastic_feedback_code
        const nextCode = await getNextScholasticFeedbackCode();

        const lastFeedback = await prisma.scholastics_feedback_dtl.findFirst({
            where: { scholastic_code },
            orderBy: { scholastic_feedback_seq_no: 'desc' }
        });

        const scholastic_feedback_seq_no = lastFeedback
            ? lastFeedback.scholastic_feedback_seq_no + 1 // Increment if feedback already exists
            : 1; // Default sequence number for new scholastic_code


        // ✅ Upload file to Azure if available
      let uploaded_file_name = null;
      let uploaded_file_path = null;

      if (req.file && req.file.buffer) {
        const allowedMimeTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'application/pdf',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).json({ error: 'Unsupported file type.' });
        }

        const trimmedFileName = req.file.originalname.length > 100
          ? req.file.originalname.substring(0, 100)
          : req.file.originalname;

        uploaded_file_name = trimmedFileName;
        uploaded_file_path = await uploadBufferToBlob(req.file.buffer, trimmedFileName, req.file.mimetype);
      }

        // Save the feedback
        const feedback = await prisma.scholastics_feedback_dtl.create({
            data: {
                scholastic_feedback_code: nextCode,
                scholastic_code,
                scholastic_feedback_seq_no,
                academic_detail: `${quickcode_name} - ${academic_year}`, // Save quickcode_name instead of scholastic_type_code
                feedback_date: new Date(feedback_date),
                title_subject,
                comment,
                signature,
                uploaded_file_name,
                uploaded_file_path,
                created_by: createdBy,
                province_code
            }
        });

        res.status(201).json({
            message: 'Scholastic feedback created successfully',
            feedback
        });
    } catch (error) {
        console.log(error); // Log the error for debugging
        res.status(500).json({ message: 'An error occurred while creating scholastic feedback.' });
    }
};

export const updateScholasticFeedback = async (req, res) => {
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
  
        // Extract `province_name` and `created_by` from the decoded token
        const provinceName = decoded.province_name;
        const UpdateBy = decoded.role_name || decoded.username || "Unknown";
  
        // Fetch `province_code` based on `province_name`
        const province = await prisma.province_mst.findFirst({
          where: { province_name: provinceName },
          select: { province_code: true },
        });
  
        if (!province) {
          return res.status(404).json({ error: "Province not found for the given name" });
        }
  
        const province_code = province.province_code;
        const {
            scholastic_feedback_code,
            scholastic_code,
            scholastic_feedback_seq_no,
            feedback_date,
            title_subject,
            comment,
            signature,
            academic_details
        } = req.body;

        // Validate required fields
        if (
            !scholastic_feedback_code ||
            !scholastic_code ||
            scholastic_feedback_seq_no === undefined || // ensure the seq_no is provided
            !feedback_date ||
            !title_subject ||
            !comment ||
            !signature ||
            !province_code ||
            !academic_details
        ) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Convert scholastic_feedback_seq_no to integer
        const scholasticFeedbackSeqNo = parseInt(scholastic_feedback_seq_no, 10);
        if (isNaN(scholasticFeedbackSeqNo)) {
            return res.status(400).json({ message: 'Invalid scholastic_feedback_seq_no; must be a number.' });
        }

        // Split academic_details into scholastic_type_code and academic_year
        let [scholastic_type_code, academic_year] = academic_details.split(' - ');

        scholastic_type_code = scholastic_type_code.trim();
        academic_year = academic_year.trim();

        // Fetch the correct quickcode from quickcode_mst
        const quickcodeData = await prisma.quickcode_mst.findFirst({
            where: {
                quick_code_type: 'schtyp',
                quickcode_name: scholastic_type_code
            },
            select: { quick_code: true, quickcode_name: true }
        });

        if (!quickcodeData) {
            return res.status(404).json({ message: `Scholastic type "${scholastic_type_code}" not found.` });
        }

        const quickcode_name = quickcodeData.quickcode_name;

        // Fetch existing feedback record based on the adjusted unique keys
        const existingFeedback = await prisma.scholastics_feedback_dtl.findFirst({
            where: {
                scholastic_feedback_code,
                scholastic_code,
                scholastic_feedback_seq_no: scholasticFeedbackSeqNo,
                province_code
            }
        });

        if (!existingFeedback) {
            return res.status(404).json({ message: `Scholastic feedback with code "${scholastic_feedback_code}" not found.` });
        }

         // ✅ Upload file to Azure if available
      let uploaded_file_name = null;
      let uploaded_file_path = null;

      if (req.file && req.file.buffer) {
        const allowedMimeTypes = [
          'image/jpeg', 'image/jpg', 'image/png', 'application/pdf',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return res.status(400).json({ error: 'Unsupported file type.' });
        }

        const trimmedFileName = req.file.originalname.length > 100
          ? req.file.originalname.substring(0, 100)
          : req.file.originalname;

        uploaded_file_name = trimmedFileName;
        uploaded_file_path = await uploadBufferToBlob(req.file.buffer, trimmedFileName, req.file.mimetype);
      }
        // Update the feedback data
        const updatedFeedback = await prisma.scholastics_feedback_dtl.update({
            where: {
                scholastic_feedback_code_scholastic_code_scholastic_feedback_seq_no_province_code: {
                    scholastic_feedback_code,
                    scholastic_code,
                    scholastic_feedback_seq_no: scholasticFeedbackSeqNo,
                    province_code
                }
            },
            data: {
                scholastic_code,
                academic_detail: `${quickcode_name} - ${academic_year}`,
                feedback_date: new Date(feedback_date),
                title_subject,
                comment,
                signature,
                uploaded_file_name: uploaded_file_name || existingFeedback.uploaded_file_name,  // ✅ correctly use the processed variables
                uploaded_file_path: uploaded_file_path || existingFeedback.uploaded_file_path,
                province_code,
                updated_by:UpdateBy,
                updated_date:new Date()
            }
        });

        res.status(200).json({
            message: 'Scholastic feedback updated successfully',
            feedback: updatedFeedback
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while updating scholastic feedback.' });
    }
};


// API endpoint to get all scholastic feedback data
export const getAllScholasticFeedback = async (req, res) => {
    try {
        // Retrieve filter criteria from request parameters or query
        const { scholastic_feedback_code, scholastic_feedback_seq_no } = req.body; // or req.params, depending on your route setup

        // Fetch all scholastic feedback records based on the specified filters
        const feedbackData = await prisma.scholastics_feedback_dtl.findMany({
            where: {
                scholastic_feedback_code: scholastic_feedback_code || undefined,
                scholastic_feedback_seq_no: scholastic_feedback_seq_no || undefined,
            },
            select: {
                scholastic_feedback_code: true,
                scholastic_code: true,
                scholastic_feedback_seq_no: true,
                academic_detail: true,
                feedback_date: true,
                title_subject: true,
                comment: true,
                signature: true,
                uploaded_file_name: true,
                uploaded_file_path: true,
                province_code: true,
            }
        });
        console.log(feedbackData);
        
        // Check if data is found
        if (feedbackData.length === 0) {
            return res.status(404).json({ message: 'No scholastic feedback records found.' });
        }

        // Return the fetched data
        res.status(200).json({
            message: 'Scholastic feedback data retrieved successfully.',
            feedbackData
        });
    } catch (error) {
        console.error(error); // Log the error for debugging
        res.status(500).json({ message: 'An error occurred while retrieving scholastic feedback data.' });
    }
};


// API endpoint to delete scholastic feedback by specific code and sequence number
export const deleteScholasticFeedback = async (req, res, next) => {
    const { scholastic_feedback_code, scholastic_feedback_seq_no } = req.params;
  
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
  
        // Extract `province_name` and `created_by` from the decoded token
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
      const feedbackSeqNo = parseInt(scholastic_feedback_seq_no, 10);
  
      if (isNaN(feedbackSeqNo)) {
        return res.status(400).json({ message: 'Invalid scholastic_feedback_seq_no; must be a number.' });
      }
  
      await prisma.scholastics_feedback_dtl.deleteMany({
        where: {
          scholastic_feedback_code,
          scholastic_feedback_seq_no: feedbackSeqNo,
          province_code,
        },
      });
  
      res.status(200).json({ message: 'Feedback deleted successfully' });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      next(new HttpException(500, 'Error deleting feedback'));
    }
  };
  
  
  

// Export the upload middleware and the API endpoint
export { upload };
