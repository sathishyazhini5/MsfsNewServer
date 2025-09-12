import { PrismaClient } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { HttpException } from '../../exceptions/HttpException.js';
import { logger } from '../../utils/logger.js';
import jwt from "jsonwebtoken";
import { EXPIRY_TIME, JWT_SECRET } from "../../config/index.js";

const prisma = new PrismaClient();
  export const defineUserTypeToComponentActivity = async (req, res, next) => {
    const {
      userTypeCode,
      provConcreCode,
      userId,
      roleCode,
      componentCode,
      activityCode,
      addFlag,
      editFlag,
      deleteFlag,
      languageCode = 'en',
    } = req.body;

    // 🧪 Helper to safely trim and truncate values
    const trim = (val) => (typeof val === 'string' ? val.trim() : val);
    const truncate = (val, max = 100) =>
      typeof val === 'string' ? val.substring(0, max) : null;

    try {
      const userType = trim(userTypeCode);
      const province = trim(provConcreCode);
      const role = trim(roleCode);
      const compCode = trim(componentCode);
      const actCode = trim(activityCode);
      const actor = trim(userId) || 'System';

// 🔍 Get user_id based on role_code
const userByRole = await prisma.users_mst.findFirst({
  where: {
    role_code: role,
      prov_concre_code: province,
  },
  select: {
    user_id: true,
  },
});

if (!userByRole) {
  return res.status(404).json({
    error: `No user found with role_code: ${role}`,
  });
}

const fetchedUserId = userByRole.user_id;


      if (!userType || !province || !role || !compCode || !actCode) {
        return res.status(400).json({
          error:
            'userTypeCode, provConcreCode, roleCode, componentCode, and activityCode are required.',
        });
      }

      logger.info('[START] Defining role mapping for:', {
        userType,
        province,
        role,
        compCode,
        actCode,
      });

      // ✅ Validate User Type
      const userTypeExists = await prisma.quickcode_mst.findUnique({
        where: {
          quick_code_type_quick_code: {
            quick_code_type: 'usrtyp',
            quick_code: userType,
          },
        },
      });
      if (!userTypeExists) {
        return res.status(400).json({ error: `Invalid userTypeCode: ${userType}` });
      }

      // ✅ Validate Province
      const provinceExists = await prisma.province_mst.findUnique({
        where: { province_code: province },
      });
      if (!provinceExists) {
        return res.status(400).json({ error: `Invalid provConcreCode: ${province}` });
      }

      // ✅ Validate Component + Activity
      const componentActivity = await prisma.component_activity.findUnique({
        where: {
          componentcode_activitycode: {
            componentcode: compCode,
            activitycode: actCode,
          },
        },
      });
      if (!componentActivity) {
        return res.status(400).json({
          error: `Invalid componentCode (${compCode}) and activityCode (${actCode}) combination.`,
        });
      }

      // ✅ Validate Role Code
      const roleExists = await prisma.quickcode_mst.findUnique({
        where: {
          quick_code_type_quick_code: {
            quick_code_type: 'rolnames',
            quick_code: role,
          },
        },
      });
      if (!roleExists) {
        return res.status(400).json({ error: `Invalid roleCode: ${role}` });
      }

      // ✅ Check Duplicate
      const existingMapping = await prisma.user_role_com_activity_mst.findFirst({
        where: {
          user_type_code: userType,
          prov_concre_code: province,
          role_code: role,
          component_code: compCode,
          activity_code: actCode,
        },
      });

      if (existingMapping) {
        return res.status(409).json({
          error: 'Mapping already exists.',
        });
      }

      // ✅ Truncate and Log Fields
      const roleName = truncate(roleExists.quickcode_name, 100);
      const componentName = truncate(componentActivity.componentname, 100);
      const activityName = truncate(componentActivity.activityname, 100);
      const langCode = truncate(languageCode, 2);
      const createdBy = truncate(actor, 50);

      logger.info('🧪 Truncated Role Name:', roleName);
      logger.info('🧪 Truncated Component Name:', componentName);
      logger.info('🧪 Truncated Activity Name:', activityName);

      // ✅ Save Mapping
      const result = await prisma.user_role_com_activity_mst.create({
        data: {
          user_type_code: userType,
          prov_concre_code: province,
          role_code: role,
          component_code: compCode,
          activity_code: actCode,
          role_name: roleName,
          component_name: componentName,
          activity_name: activityName,
          add_flag: addFlag ?? false,
          edit_flag: editFlag ?? false,
          delete_flag: deleteFlag ?? false,
          language_code: langCode,
          user_id: fetchedUserId,
          created_by: actor,
          created_date: new Date(),
          concurrency_val: 1,
        },
      });

      return res.status(201).json({
        message: 'Mapping created successfully.',
        data: result,
      });
    } catch (error) {
      logger.error('❌ Server Error in defineUserTypeToComponentActivity:', error);
      return res.status(500).json({
        error: 'Internal Server Error.',
      });
    }
  };



export const getDropdownOptions = async (req, res, next) => {
    try {
      // Fetch UserType options
      const userTypes = await prisma.quickcode_mst.findMany({
        where: { quick_code_type: 'usrtyp' },
        select: { quick_code: true, quickcode_name: true },
      });
  
      // Fetch Province options
      const provinces = await prisma.province_mst.findMany({
        select: { province_code: true, province_name: true },
      });
  
      // Fetch Concretion options
      const concretions = await prisma.concretion_defination_mst.findMany({
        select: { concretion_code: true, concretion_name: true },
      });
  
      // Combine provinces and concretions for a single dropdown
      const combinedProvincesAndConcretions = [
        ...provinces.map(p => ({ code: p.province_code, name: p.province_name, type: 'Province' })),
        ...concretions.map(c => ({ code: c.concretion_code, name: c.concretion_name, type: 'Concretion' })),
      ];
  
      // Fetch RoleName options
      const roleNames = await prisma.quickcode_mst.findMany({
        where: { quick_code_type: 'rolnam' },
        select: { quick_code: true, quickcode_name: true },
      });
  
      res.status(StatusCodes.OK).json({
        userTypes,
        provincesAndConcretions: combinedProvincesAndConcretions,
        roleNames,
      });
    } catch (error) {
      logger.error('Error fetching dropdown options:', error.message);
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch dropdown options'));
    }
  };

  export const getComponentActivities = async (req, res, next) => {
    try {
      // Fetch all component and activity details
      const componentActivities = await prisma.component_activity.findMany({
        select: {
          componentcode: true,
          componentname: true,
          activitycode: true,
          activityname: true,
        },
        orderBy: { componentcode: 'asc' }, // Sort by component code if needed
      });
  
      // Respond with the fetched data
      res.status(StatusCodes.OK).json({ data: componentActivities });
    } catch (error) {
      logger.error('Error fetching component activities:', error.message);
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch component activities'));
    }
  };

  export const getComponentActivityList = async (req, res, next) => {
    try {
      const data = await prisma.component_activity.findMany({
        orderBy: [
          { componentcode: 'asc' },
          { activitycode: 'asc' }
        ]
      });
  
      if (!data || data.length === 0) {
        logger.warn('No component activities found.');
        return res.status(StatusCodes.NOT_FOUND).json({ message: 'No component activities found.' });
      }
  
      logger.info('Fetched component activity list successfully.');
      res.status(StatusCodes.OK).json({
        message: 'Component activity list retrieved successfully.',
        data
      });
    } catch (error) {
      logger.error('Error fetching component activity list:', error);
      return next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch component activity list.'));
    }
  };

  export const getUserRoleActivityMappings = async (req, res, next) => {
    try {
      // Step 1: Fetch all mappings
      const data = await prisma.user_role_com_activity_mst.findMany({
        orderBy: {
          created_date: 'desc',
        },
        include: {
          componentActivity: true,
          user: true,
        },
      });
  
      if (!data || data.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({
          message: 'No user role activity mappings found.',
          data: [],
        });
      }
  
      // Step 2: Fetch user types and provinces
      const userTypes = await prisma.quickcode_mst.findMany({
        where: { quick_code_type: 'usrtyp' },
        select: {
          quick_code: true,
          quickcode_name: true,
        },
      });
  
      const provinces = await prisma.province_mst.findMany({
        select: { province_code: true, province_name: true },
      });
  
      // Step 3: Create lookup maps
      const userTypeMap = Object.fromEntries(userTypes.map(type => [type.quick_code, type.quickcode_name]));
      const provinceMap = Object.fromEntries(provinces.map(prov => [prov.province_code, prov.province_name]));
  
      // Step 4: Transform and send response
      logger.info('User Role Activity mappings fetched successfully.');
  
      res.status(StatusCodes.OK).json({
        message: 'User Role Activity mappings fetched successfully.',
        data: data.map((item, index) => ({
          id: index + 1,
          user_type_code: item.user_type_code,
          user_type_name: userTypeMap[item.user_type_code] || item.user_type_code,
          user_full_name: `${item.user?.first_name || ''} ${item.user?.last_name || ''}`.trim(),
          prov_concre_code: item.prov_concre_code,
          province_name: provinceMap[item.prov_concre_code] || item.prov_concre_code,
          role_code: item.role_code,
          role_name: item.role_name,
          component_code: item.component_code,
          component_name: item.component_name,
          activity_code: item.activity_code,
  
          // ✅ Dynamically generate activity name from flags
          activity_name: [
            item.add_flag && 'ADD',
            item.edit_flag && 'EDIT',
            item.delete_flag && 'DELETE',
          ].filter(Boolean).join(', ') || 'VIEW',
  
          add_flag: item.add_flag,
          edit_flag: item.edit_flag,
          delete_flag: item.delete_flag,
          created_by: item.created_by,
          created_date: item.created_date,
        })),
      });
    } catch (error) {
      logger.error('Error fetching user role activity mappings:', error);
      return next(
        new HttpException(
          StatusCodes.INTERNAL_SERVER_ERROR,
          'Failed to fetch user role activity mappings'
        )
      );
    }
  };
  
  export const getDropdownOptionsForLoggedInUser = async (req, res, next) => {
    try {
      // 1. Extract and decode token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new HttpException(StatusCodes.UNAUTHORIZED, 'Token missing or invalid');
      }
  
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
  
      const {
        role_code,
        role_name,
        user_type_code, // ✅ newly included
        province_code,
        province_name,
        concretion_code,
        concretion_name,
        user_id,
      } = decoded;
  
      // 2. Fetch User Type using user_type_code
      const userType = await prisma.quickcode_mst.findFirst({
        where: {
          quick_code: user_type_code,
          quick_code_type: 'usrtyp',
        },
        select: {
          quick_code: true,
          quickcode_name: true,
        },
      });
  
      // 3. Prepare Region info
      let region = null;
      if (province_code) {
        region = {
          code: province_code,
          name: province_name,
          type: 'Province',
        };
      } else if (concretion_code) {
        region = {
          code: concretion_code,
          name: concretion_name,
          type: 'Concretion',
        };
      }
  
      // 4. Fetch actual Role Names (like Assistant Manager, Manager, etc.)
      const roleNames = await prisma.quickcode_mst.findMany({
        where: { quick_code_type: 'rolnames' },
        orderBy: { quick_code: 'asc' },
        select: {
          quick_code: true,
          quickcode_name: true,
          language_code: true,
          created_date: true,
        },
      });
  
      // 5. Send final response
      res.status(StatusCodes.OK).json({
        userType,
        region,
        roleNames,
        loggedInUser: user_id,
      });
  
    } catch (error) {
      console.error('Error in getDropdownOptionsForLoggedInUser:', error.message);
      next(new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to fetch dropdown options for logged-in user'));
    } finally {
      await prisma.$disconnect();
    }
  };
 export const editUserTypeToComponentActivity = async (req, res, next) => {
  const {
    userTypeCode,
    provConcreCode,
    userId,
    roleCode,
    componentCode,
    activityCode,
    addFlag,
    editFlag,
    deleteFlag,
    languageCode = 'en',
  } = req.body;

  const trim = (val) => (typeof val === 'string' ? val.trim() : val);
  const truncate = (val, max = 100) =>
    typeof val === 'string' ? val.substring(0, max) : null;

  try {
    const userType = trim(userTypeCode);
    const province = trim(provConcreCode);
    const role = trim(roleCode);
    const compCode = trim(componentCode);
    const actCode = trim(activityCode);
    const actor = trim(userId) || 'System';

    // if (!userType || !province || !role || !compCode || !actCode) {
    //   return res.status(400).json({
    //     error: 'userTypeCode, provConcreCode, roleCode, componentCode, and activityCode are required.',
    //   });
    // }

    // ✅ Validate foreign keys
    const validations = await Promise.all([
      prisma.quickcode_mst.findFirst({
        where: {
          quick_code_type: 'usrtyp',
          quick_code: userType,
        },
      }),
      prisma.province_mst.findFirst({ where: { province_code: province } }),
      prisma.component_activity.findFirst({
        where: {
          componentcode: compCode,
          activitycode: actCode,
        },
      }),
      prisma.quickcode_mst.findFirst({
        where: {
          quick_code_type: 'rolnames',
          quick_code: role,
        },
      }),
    ]);

    const [userTypeExists, provinceExists, componentActivity, roleExists] = validations;

    if (!userTypeExists)
      return res.status(400).json({ error: `Invalid userTypeCode: ${userType}` });
    if (!provinceExists)
      return res.status(400).json({ error: `Invalid provConcreCode: ${province}` });
    if (!componentActivity)
      return res.status(400).json({ error: `Invalid component/activity combination.` });
    if (!roleExists)
      return res.status(400).json({ error: `Invalid roleCode: ${role}` });

    const roleName = truncate(roleExists.quickcode_name);
    const componentName = truncate(componentActivity.componentname);
    const activityName = truncate(componentActivity.activityname);
    const langCode = truncate(languageCode, 2);
    const updatedBy = truncate(actor, 50);

  const updated = await prisma.user_role_com_activity_mst.upsert({
  where: {
    user_type_code_prov_concre_code_role_code_component_code_activity_code: {
      user_type_code: userType,
      prov_concre_code: province,
      role_code: role,
      component_code: compCode,
      activity_code: actCode,
    },
  },
  update: {
    role_name: roleName,
    component_name: componentName,
    activity_name: activityName,
    add_flag: addFlag ?? false,
    edit_flag: editFlag ?? false,
    delete_flag: deleteFlag ?? false,
    language_code: langCode,
    updated_by: updatedBy,
    updated_date: new Date(),
  },
  create: {
    user_type_code: userType,
    prov_concre_code: province,
    role_code: role,
    component_code: compCode,
    activity_code: actCode,
    role_name: roleName,
    component_name: componentName,
    activity_name: activityName,
    add_flag: addFlag ?? false,
    edit_flag: editFlag ?? false,
    delete_flag: deleteFlag ?? false,
    language_code: langCode,
    updated_by: updatedBy,
    updated_date: new Date(),
  },
});


    return res.status(200).json({
      message: 'Mapping updated successfully.',
      data: updated,
    });
  } catch (error) {
    logger.error('❌ Server Error in editUserTypeToComponentActivity:', error);
    return res.status(500).json({ error: 'Internal Server Error.' });
  }
};


export const deleteMappingsByUserTypeAndProvinceAndRole = async (req, res, next) => {
  const {
    userTypeCode,
    provConcreCode,
    roleCode,
    componentCode,
    activityCode
  } = req.body;

  // ✅ Validate required fields
  if (!userTypeCode || !provConcreCode || !roleCode || !componentCode || !activityCode) {
    return res.status(400).json({
      error: 'All of userTypeCode, provConcreCode, roleCode, componentCode, and activityCode are required.'
    });
  }

  // 🧪 Trim inputs
  const trim = (val) => (typeof val === 'string' ? val.trim() : val);
  const userType = trim(userTypeCode);
  const province = trim(provConcreCode);
  const role = trim(roleCode);
  const comp = trim(componentCode);
  const act = trim(activityCode);

  try {
    // ✅ Perform delete with full composite key
    const deleted = await prisma.user_role_com_activity_mst.deleteMany({
      where: {
        user_type_code: userType,
        prov_concre_code: province,
        role_code: role,
        component_code: comp,
        activity_code: act
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        message: `No mapping found for given userTypeCode (${userType}), provConcreCode (${province}), roleCode (${role}), componentCode (${comp}), and activityCode (${act}).`
      });
    }

    return res.status(200).json({
      message: `✅ Deleted ${deleted.count} mapping(s) successfully.`
    });
  } catch (error) {
    logger.error('❌ Server Error in deleteMappingsByUserTypeAndProvinceAndRole:', error);
    return res.status(500).json({ error: 'Internal Server Error.' });
  }
};


