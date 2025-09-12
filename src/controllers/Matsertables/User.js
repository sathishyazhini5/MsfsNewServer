import { PrismaClient } from '@prisma/client';
import { sendRichEmail } from '../../middlewares/emailService.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt'; // if you're using ES Modules
import jwt from 'jsonwebtoken';


const prisma = new PrismaClient();



const generateUserId = async () => {
  const latestUser = await prisma.users_mst.findFirst({
    orderBy: { user_id: 'desc' },
    select: { user_id: true }
  });

  if (!latestUser) {
    return 'User001';
  }

  const latestUserId = latestUser.user_id;
  const userNumber = parseInt(latestUserId.replace('User', ''), 10);
  const nextUserNumber = userNumber + 1;
  const nextUserId = `User${nextUserNumber.toString().padStart(3, '0')}`;

  return nextUserId;
};



export const createUser = async (req, res) => {
  const {
    province_code,

    first_name,
    last_name,
    user_id,
    password,
    user_type_name,
    role_name,
    language_code,
  } = req.body;

  try {
    // Validate province_code
    const province = await prisma.province_mst.findFirst({ where: { province_code } });
    if (!province) return res.status(400).json({ error: 'Invalid province_code' });

    const prov_concre_code = province.province_code;

    // Validate user_type_name
    const userTypeEntry = await prisma.quickcode_mst.findFirst({
      where: { quick_code_type: 'usrtyp', quickcode_name: user_type_name },
    });
    if (!userTypeEntry) return res.status(400).json({ error: 'Invalid user_type_name' });

    // Validate role_name
    const roleEntry = await prisma.quickcode_mst.findFirst({
      where: { quick_code_type: 'rolnames', quickcode_name: role_name },
    });
    if (!roleEntry) return res.status(400).json({ error: 'Invalid role_name' });

    const user_type_code = userTypeEntry.quick_code;
    const role_code = roleEntry.quick_code;

    // Check if user already exists
   const existingUser = await prisma.users_mst.findFirst({
  where: {
    user_id,
  },
});
if (existingUser) {
  return res.status(400).json({ error: 'Email (User ID) already exists. Please use a different one.' });
}

    // Hash password
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await prisma.users_mst.create({
      data: {
        user_type_code,
        prov_concre_code,
        user_id,
        first_name,
        last_name,
        password: password,
        role_code,
        role_name,
        language_code,
        concurrency_val: 1,
        created_by: 'system',
        created_date: new Date(),
      },
    });

    // Send welcome email with login link
    const htmlContent = `
      <p>Dear Rev. Father,</p>
      <p>Welcome to <strong>MSFS APP</strong>, the dedicated mobile app for MSFS Confreres!</p>
      <p>Your registered email for this account is: <strong>${user_id}</strong></p>
      <p>To access your account, please use the login credentials below:</p>
      <h3 style="color: #1976d2;">🔐 User ID: ${user_id}</h3>
      <h3 style="color: #1976d2;">🔑 Password: ${password}</h3>
      <p>Please do not share these credentials with anyone.</p>
      <p>If you did not request this account, please ignore this email.</p>
      <p>For any assistance, feel free to contact our support team at <a href="mailto:estatusmsfs@gmail.com">estatusmsfs@gmail.com</a></p>
      <br/>
      <p>➡️ <strong>Login here:</strong> <a href="https://msfs.adminpro.co.in/" style="color: #1976d2;">https://msfs.adminpro.co.in/</a></p>
      <br/>
      <p>Enjoy using MSFS APP!</p>
      <p>Fraternally,<br/><strong>Admin Team</strong><br/>Desales Technologies</p>
    `;

    const textContent = `
Dear Rev. Father,

Welcome to MSFS APP – the dedicated mobile app for MSFS Confreres!

User ID: ${user_id}
Password: ${password}

Login here: https://msfs.adminpro.co.in/

For help, email: estatusmsfs@gmail.com

Fraternally,
Admin Team – Desales Technologies
    `;

    await sendRichEmail({
      to: user_id,
      subject: 'Welcome to MSFS APP – Your Login Credentials',
      text: textContent,
      html: htmlContent,
    });

    return res.status(201).json(newUser);

  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002') {
      console.error('Prisma Unique Constraint Error:', error.meta);
    }
    return res.status(500).json({
      error: error.message || 'Failed to create user',
      prismaMeta: error.meta || {},
    });
  }
};





export const getUsers = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token is missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const loggedProvinceCode = decoded.province_code;
    const loggedUserTypeCode = decoded.user_type_code;

    // ✅ Find logged-in user's user_type_name
    const userTypeDetails = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type: 'usrtyp',
        quick_code: loggedUserTypeCode,
      },
      select: {
        quickcode_name: true,
      },
    });

    const loggedUserTypeName = userTypeDetails?.quickcode_name || 'Unknown';

    // ✅ Province condition based on logged-in user's type
    let whereCondition = {
      user_id: { not: '' },
    };

    if (loggedUserTypeName === 'Province Admin') {
      whereCondition.prov_concre_code = loggedProvinceCode; // Only Province Admin filter by province
    }

    // ✅ Fetch users according to condition
    const users = await prisma.users_mst.findMany({
      where: whereCondition,
    });

    const provinceCodes = users.map(user => user.prov_concre_code);
    const roleCodes = users.map(user => user.role_code);
    const userTypeCodes = users.map(user => user.user_type_code);

    const provinces = await prisma.province_mst.findMany({
      where: { province_code: { in: provinceCodes } },
      select: { province_code: true, province_name: true },
    });

    const roles = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'rolnames', // ✅ Only fetching roles from 'rolnames'
        quick_code: { in: roleCodes },
      },
      select: { quick_code: true, quickcode_name: true },
    });

    const userTypes = await prisma.quickcode_mst.findMany({
      where: {
        quick_code_type: 'usrtyp',
        quick_code: { in: userTypeCodes },
      },
      select: { quick_code: true, quickcode_name: true },
    });

    const provinceMap = Object.fromEntries(
      provinces.map(p => [p.province_code, p.province_name])
    );

    const roleMap = Object.fromEntries(
      roles.map(r => [r.quick_code, r.quickcode_name])
    );

    const userTypeMap = Object.fromEntries(
      userTypes.map(u => [u.quick_code, u.quickcode_name])
    );

    // ✅ Final Filtering
    const filteredUsers = users
      .filter(user =>
        roleMap.hasOwnProperty(user.role_code) &&            // ✅ Only if role is inside 'rolnames'
        user.prov_concre_code === loggedProvinceCode          // ✅ Only same province users
      )
      .map(user => ({
        ...user,
        province_name: provinceMap[user.prov_concre_code],
        province_code: user.prov_concre_code, 
        role_name: roleMap[user.role_code] || user.role_code,
        user_type_name: userTypeMap[user.user_type_code] || user.user_type_code,
        username: user.user_id || 'N/A',
        password: user.password, // show saved hashed password
      }));

    return res.status(200).json(filteredUsers);

  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
};


export const updateUser = async (req, res) => {
  const { user_id, prov_concre_code } = req.params;
  const {
    first_name,
    last_name,
    username, // <--- Problematic field
    password,
    user_type_name,
    role_name,
    language_code,
    new_prov_concre_code
  } = req.body;

  try {
    const existingUser = await prisma.users_mst.findFirst({
      where: { prov_concre_code, user_id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData = {};

    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    // if (username !== undefined) updateData.username = username; // <--- Remove or adjust based on your schema
    if (password !== undefined) {
      updateData.password = password; // Save plain password directly
    }
    if (user_type_name !== undefined) {
      const userTypeEntry = await prisma.quickcode_mst.findFirst({
        where: { quick_code_type: 'usrtyp', quickcode_name: user_type_name }
      });
      if (!userTypeEntry) return res.status(400).json({ error: 'Invalid user_type_name' });
      updateData.user_type_code = userTypeEntry.quick_code;
    }
    if (role_name !== undefined) {
      const roleEntry = await prisma.quickcode_mst.findFirst({
        where: { quick_code_type: 'rolnames', quickcode_name: role_name }
      });
      if (!roleEntry) return res.status(400).json({ error: 'Invalid role_name' });
      updateData.role_code = roleEntry.quick_code;
      updateData.role_name = role_name;
    }
    if (language_code !== undefined) updateData.language_code = language_code;
    updateData.updated_by = 'system';
    updateData.updated_date = new Date();

    const finalProvConcreCode = new_prov_concre_code || prov_concre_code;

    const result = await prisma.$transaction(async (prisma) => {
      if (finalProvConcreCode !== prov_concre_code) {
        await prisma.users_mst.delete({
          where: {
            user_type_code_prov_concre_code_user_id: {
              user_type_code: existingUser.user_type_code,
              prov_concre_code,
              user_id
            }
          }
        });

        return await prisma.users_mst.create({
          data: {
            ...updateData,
            user_type_code: updateData.user_type_code || existingUser.user_type_code,
            prov_concre_code: finalProvConcreCode,
            user_id,
            // username: updateData.username || existingUser.username, // Adjust this line
            concurrency_val: 1,
            created_by: 'admin',
            created_date: new Date(),
            updated_by: 'admin',
            updated_date: new Date()
          }
        });
      } else {
        return await prisma.users_mst.update({
          where: {
            user_type_code_prov_concre_code_user_id: {
              user_type_code: existingUser.user_type_code,
              prov_concre_code,
              user_id
            }
          },
          data: updateData,
        });
      }
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Failed to update user' });
  }
};









export const deleteUser = async (req, res) => {
  const { user_id, province_code } = req.params;

  try {
    // First fetch the user to get user_type_code
    const existingUser = await prisma.users_mst.findFirst({
      where: { prov_concre_code: province_code, user_id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.users_mst.delete({
      where: {
        user_type_code_prov_concre_code_user_id: {
          user_type_code: existingUser.user_type_code,
          prov_concre_code: province_code,
          user_id,
        },
      },
    });

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Failed to delete user' });
  }
};
