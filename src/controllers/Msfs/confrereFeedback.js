import { PrismaClient } from '@prisma/client';
import { response } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadBufferToBlob } from '../../middlewares/azureBlob.js';

const prisma = new PrismaClient();

// Configure Multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');  // specify the uploads directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Save file with timestamp to avoid name conflicts
  }
});

const upload = multer({ storage: storage });


// Generate sequence number based on confrer_code
const generateSequenceNumber = async (confrer_code) => {
  const lastFeedbackForConfrere = await prisma.confreres_feedback_dtl.findFirst({
    where: { confrer_code },
    orderBy: { confrer_feedback_seq_no: 'desc' }
  });

  if (!lastFeedbackForConfrere) {
    return 1;
  }

  return lastFeedbackForConfrere.confrer_feedback_seq_no + 1;
};

// Save Confrere Feedback function
export const saveConfrereFeedback = async (req, res) => {

  try {


    const { confrer_code, province_code } = req.params; // Get both confrer_code and province_code from req.params

    // Destructure other values from request body
    const {

      designation_code,
      feedback_type_code,
      title_subject,
      feedback_description,
      remarks,
      signature,
      commencement_date
    } = req.body;



    // Find confrer_code from confreres_dtl table
    const confrere = await prisma.confreres_dtl.findUnique({
      where: {
        confrer_code_province_code: {
          confrer_code: confrer_code,
          province_code: province_code,
        },
      },
    });

    if (!confrere) {
      return res.status(404).json({ error: 'Confrere not found' });
    }

    const seqNo = await generateSequenceNumber(confrer_code);


    // Find designation_code from quickcode_mst where quick_code_type is 'destyp'
    // Check if the designation_code exists in appoint_transfer_dtl first
    const appointTransfer = await prisma.appoint_transfer_dtl.findFirst({
      where: { designation_code: designation_code }
    });

    if (!appointTransfer) {
      console.error('Designation code not found in appoint_transfer_dtl:', designation_code);  // Log missing designation code
      return res.status(404).json({ error: 'Designation not found in appoint_transfer_dtl' });
    }

    // Then check in quickcode_mst
    const designation = await prisma.quickcode_mst.findFirst({
      where: { quick_code: designation_code, quick_code_type: 'destyp' }
    });

    if (!designation) {
      console.error('Designation not found in quickcode_mst:', designation_code);  // Log missing designation code
      return res.status(404).json({ error: 'Designation not found in quickcode_mst' });
    }


    // If found in both, proceed with the rest of the logic
    console.log('Designation code is valid in both appoint_transfer_dtl and quickcode_mst:', designation_code);


    // Find feedback_type_code from quickcode_mst where quick_code_type is 'fedtyp'
    const feedbackType = await prisma.quickcode_mst.findFirst({
      where: { quick_code: feedback_type_code, quick_code_type: 'fedtyp' },
    });

    if (!feedbackType) {
      return res.status(404).json({ error: 'Feedback type not found' });
    }

    // ✅ File Validation Logic
    let feedback_file_name = null;
    let feedback_file_url = null;

    if (req.file && req.file.buffer) {
      const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
      ];

      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Unsupported file type. Allowed: .jpeg, .jpg, .png, .pdf, .xlsx, .xls, .docx' });
      }

      const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
      if (req.file.size > maxSizeInBytes) {
        return res.status(400).json({ error: 'File size exceeds 10MB limit.' });
      }

      const trimmedFileName = req.file.originalname.length > 100
        ? req.file.originalname.substring(0, 100)
        : req.file.originalname;

      feedback_file_name = trimmedFileName;
      feedback_file_url = await uploadBufferToBlob(req.file.buffer, trimmedFileName, req.file.mimetype);
    }



    //      // File upload handled by Multer middleware
    // let feedbackFileName = null;
    // let feedbackFilePath = null;
    // if (req.file) {
    //   feedbackFileName = req.file.filename;
    //   feedbackFilePath = req.file.path;
    // }



    // Save feedback with uploaded file (Multer will handle the upload)
    const feedback = await prisma.confreres_feedback_dtl.create({
      data: {

        confrer_code,
        confrer_feedback_seq_no: seqNo,
        province_code,  // Get the province_code from req.params
        commencement_date: new Date(commencement_date),
        designation_code: designation_code,
        feedback_type_code: feedback_type_code,
        title_subject: title_subject || null,
        feedback_description: feedback_description || null,
        remarks: remarks || null,
        signature: signature || null,
        feedback_file_name: feedback_file_name,
        feedback_file_path: feedback_file_url,
        language_code: 'en',
        concurrency_val: 1,
        created_by: 'admin',
        created_date: new Date(),
      }
    });


    console.log(req.body)
    return res.status(201).json({ message: 'Feedback saved successfully', feedback });

  } catch (error) {
    console.error('Error saving feedback:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};


export const getDesignationByConfrerCodeinAppointTsf = async (req, res) => {
  try {
    const { confrer_code } = req.params;

    // Step 1: Fetch all appoint_transfer_dtl by confrer_code
    const appointTransferDetailsList = await prisma.appoint_transfer_dtl.findMany({
      where: {
        confrer_code: confrer_code
      },
      select: {
        designation_code: true,  // Only fetch the designation_code
      }
    });

    // If no appoint_transfer_dtl records are found, return an error
    if (!appointTransferDetailsList.length) {
      return res.status(404).json({ error: 'No appointment transfer details found for the provided confrer_code.' });
    }

    // Step 2: Fetch all the designation_names from quickcode_mst where quick_code_type is 'destyp'
    const designationCodes = appointTransferDetailsList.map(item => item.designation_code);

    const designationDetailsList = await prisma.quickcode_mst.findMany({
      where: {
        quick_code: {
          in: designationCodes
        },
        quick_code_type: 'destyp'
      },
      select: {
        quick_code: true,
        quickcode_name: true,  // Fetch the quickcode_name as designation_name
      }
    });

    // Create a map of designation codes to designation names for easier lookup
    const designationMap = designationDetailsList.reduce((acc, curr) => {
      acc[curr.quick_code] = curr.quickcode_name;
      return acc;
    }, {});

    // Step 3: Format the result with designation_code and corresponding designation_name
    const result = appointTransferDetailsList.map(item => ({
      designation_code: item.designation_code,
      designation_name: designationMap[item.designation_code] || 'No designation name found'
    }));

    // Step 4: Return all designations
    return res.status(200).json({
      confrer_code: confrer_code,
      designations: result
    });

  } catch (error) {
    console.error('Error fetching designation details:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};



export const updateConfrereFeedback = async (req, res) => {
  try {
    const { confrer_code, province_code, confrer_feedback_seq_no } = req.params; // Extract from params
    const {
      designation_code,
      feedback_type_code,
      title_subject,
      feedback_description,
      remarks,
      signature,
      commencement_date,
      existing_file_path,
    } = req.body;

    // Step 1: Validate required parameters
    if (!confrer_feedback_seq_no) {
      return res.status(400).json({ message: 'Sequence number is required to update feedback.' });
    }

    // Step 2: Validate designation_code and feedback_type_code
    const appointTransfer = await prisma.appoint_transfer_dtl.findFirst({ where: { designation_code } });
    if (!appointTransfer) {
      return res.status(404).json({ message: 'Designation not found in appoint_transfer_dtl.' });
    }

    const designation = await prisma.quickcode_mst.findFirst({
      where: { quick_code: designation_code, quick_code_type: 'destyp' },
    });
    if (!designation) {
      return res.status(404).json({ message: 'Designation not found in quickcode_mst.' });
    }

    const feedbackType = await prisma.quickcode_mst.findFirst({
      where: { quick_code: feedback_type_code, quick_code_type: 'fedtyp' },
    });
    if (!feedbackType) {
      return res.status(404).json({ message: 'Feedback type not found.' });
    }

     // ✅ File Validation Logic
     let feedback_file_name = null;
     let feedback_file_url = null;
 
     if (req.file && req.file.buffer) {
       const allowedMimeTypes = [
         'image/jpeg', 'image/jpg', 'image/png',
         'application/pdf',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
         'application/vnd.ms-excel', // .xls
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
       ];
 
       if (!allowedMimeTypes.includes(req.file.mimetype)) {
         return res.status(400).json({ error: 'Unsupported file type. Allowed: .jpeg, .jpg, .png, .pdf, .xlsx, .xls, .docx' });
       }
 
       const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
       if (req.file.size > maxSizeInBytes) {
         return res.status(400).json({ error: 'File size exceeds 10MB limit.' });
       }
 
       const trimmedFileName = req.file.originalname.length > 100
         ? req.file.originalname.substring(0, 100)
         : req.file.originalname;
 
       feedback_file_name = trimmedFileName;
       feedback_file_url = await uploadBufferToBlob(req.file.buffer, trimmedFileName, req.file.mimetype);
     }
     else if (existing_file_path) {
      // ✅ No new file uploaded → Use existing file URL
      feedback_file_url = existing_file_path;
    }
 
 
 

    // Step 4: Update feedback data using the composite key
    const updatedFeedback = await prisma.confreres_feedback_dtl.update({
      where: {
        confrer_code_confrer_feedback_seq_no_province_code: {
          confrer_code,
          confrer_feedback_seq_no: parseInt(confrer_feedback_seq_no, 10), // Ensure it's an integer
          province_code: province_code.trim(),
        },
      },
      data: {
        designation_code,
        feedback_type_code,
        commencement_date: new Date(commencement_date),
        title_subject: title_subject || null,
        feedback_description: feedback_description || null,
        remarks: remarks || null,
        signature: signature || null,
        feedback_file_name: feedback_file_url ? feedback_file_url.split('/').pop() : null, // Extract filename from URL
        feedback_file_path: feedback_file_url,
        language_code: 'en', // Default value
        concurrency_val: 1, // Default value
        updated_by: 'admin', // Default value
        updated_date: new Date(), // Automatically set to current date
      },
    });

    return res.status(200).json({ message: 'Feedback updated successfully', updatedFeedback });
  } catch (error) {
    console.error('Error updating feedback:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};



export const deleteConfrereFeedback = async (req, res) => {
  try {
    const { confrer_code, confrer_feedback_seq_no } = req.params;

    // Find the feedback entry using confrer_code and confrer_feedback_seq_no
    const feedback = await prisma.confreres_feedback_dtl.findFirst({
      where: {
        confrer_code,
        confrer_feedback_seq_no: parseInt(confrer_feedback_seq_no, 10),
      }
    });

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Ensure you're using the correct composite key format for deletion
    await prisma.confreres_feedback_dtl.delete({
      where: {
        confrer_code_confrer_feedback_seq_no_province_code: {
          confrer_code: feedback.confrer_code,
          confrer_feedback_seq_no: feedback.confrer_feedback_seq_no,
          province_code: feedback.province_code // Add province_code if it is part of the composite key
        }
      }
    });

    return res.status(200).json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};


