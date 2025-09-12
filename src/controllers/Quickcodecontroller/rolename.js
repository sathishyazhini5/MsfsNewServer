import { PrismaClient } from '@prisma/client';
import { JWT_SECRET } from "../../config/index.js";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();


export const createRoleNameQuickCode = async (req, res) => {
  const { language_code, quickcode_name } = req.body;
  const quick_code_type = 'rolnames';

  try {
    // Check duplicate
    const duplicateEntry = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type,
        quickcode_name: {
          equals: quickcode_name,
          mode: 'insensitive',
        },
      },
    });

    if (duplicateEntry) {
      return res.status(400).json({
        error: `Role name '${quickcode_name}' already exists.`,
      });
    }

    // Generate quick_code
    const latestCode = await prisma.quickcode_mst.findFirst({
      where: { quick_code_type },
      orderBy: { quick_code: 'desc' },
    });

    let newQuickCode = 'ROL001';
    if (latestCode) {
      const lastNumber = parseInt(latestCode.quick_code.slice(3)) || 0;
      newQuickCode = `ROL${String(lastNumber + 1).padStart(3, '0')}`;
    }

    // Get any province (since token is removed)
    const province = await prisma.province_mst.findFirst();
    if (!province) {
      return res.status(404).json({ error: 'No province found in the database' });
    }
    const province_code = province.province_code;

    const newQuickCodeEntry = await prisma.quickcode_mst.create({
      data: {
        province_code,
        quick_code_type,
        quick_code: newQuickCode,
        language_code,
        quickcode_name,
        concurrency_val: 1,
        created_by: 'system',
        created_date: new Date(),
      },
    });

    res.json(newQuickCodeEntry);
  } catch (error) {
    console.error('Error creating role name quick code:', error);
    res.status(500).json({ error: 'Failed to create role name quick code' });
  } finally {
    await prisma.$disconnect();
  }
};

  
export const getRoleNameQuickCodes = async (req, res) => {
  try {
    const quick_code_type = 'rolnames';

    const roleNames = await prisma.quickcode_mst.findMany({
      where: { quick_code_type },
      orderBy: { quick_code: 'asc' }, // Optional: sort by code
      select: {
        quick_code: true,
        quickcode_name: true,
        language_code: true,
        created_date: true,
      },
    });

    res.status(200).json(roleNames);
  } catch (error) {
    console.error('Error fetching role name quick codes:', error);
    res.status(500).json({ error: 'Failed to fetch role name quick codes' });
  } finally {
    await prisma.$disconnect();
  }
};



export const updateRoleNameQuickCode = async (req, res) => {
  const { quick_code } = req.params;
  const { quickcode_name, language_code } = req.body;
  const quick_code_type = 'rolnames';

  try {
    const existingEntry = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code,
        quick_code_type,
      },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: `No role name found with code ${quick_code}` });
    }

    const duplicateCheck = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type,
        quickcode_name: {
          equals: quickcode_name,
          mode: 'insensitive',
        },
        NOT: {
          quick_code,
        },
      },
    });

    if (duplicateCheck) {
      return res.status(400).json({
        error: `Role name '${quickcode_name}' already exists.`,
      });
    }

    const updatedEntry = await prisma.quickcode_mst.update({
      where: {
        quick_code_type_quick_code: {
          quick_code_type,
          quick_code,
        },
      },
      data: {
        quickcode_name,
        language_code,
      },
    });

    res.status(200).json(updatedEntry);
  } catch (error) {
    console.error('Error updating role name quick code:', error);
    res.status(500).json({ error: 'Failed to update role name quick code' });
  } finally {
    await prisma.$disconnect();
  }
};

export const deleteRoleNameQuickCode = async (req, res) => {
  const { quick_code } = req.params;
  const quick_code_type = 'rolnames';

  try {
    console.log(`🧾 Deleting role: ${quick_code}`);

    const existingEntry = await prisma.quickcode_mst.findFirst({
      where: {
        quick_code_type,
        quick_code,
      },
    });

    if (!existingEntry) {
      return res.status(404).json({ error: 'Role name entry not found' });
    }

    // ✅ You can uncomment this once you confirm the correct table name
    // const isUsed = await prisma.YOUR_MODEL_HERE.findFirst({
    //   where: { role_code: quick_code },
    // });

    // if (isUsed) {
    //   return res.status(400).json({
    //     error: `Cannot delete: Role '${quick_code}' is currently assigned.`,
    //   });
    // }

    await prisma.quickcode_mst.deleteMany({
      where: {
        quick_code_type,
        quick_code,
      },
    });

    res.json({ message: `Role '${quick_code}' deleted successfully` });
  } catch (error) {
    console.error('🔥 Error deleting role name:', error);
    res.status(500).json({ error: 'Failed to delete role name' });
  } finally {
    await prisma.$disconnect();
  }
};



