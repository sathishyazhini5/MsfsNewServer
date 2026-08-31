import { PrismaClient } from '@prisma/client';
import { resolveDataScope, sendScopeError } from '../utils/dataScope.js';
import { getActivities } from '../services/activityService.js';

const prisma = new PrismaClient();

const scopeAndFetch = async (req, res, recentOnly) => {
  try {
    const { provinceCodes } = await resolveDataScope(req, prisma, req.query.province_code || null);
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 20, 1), 50);
    const data = await getActivities({ prisma, provinceCodes, recentOnly, page, pageSize });
    return res.status(200).json({ message: 'Activities fetched successfully.', data });
  } catch (error) {
    return sendScopeError(res, error, 'Unable to load recent activity.');
  }
};

export const recentActivities = (req, res) => scopeAndFetch(req, res, true);
export const allActivities = (req, res) => scopeAndFetch(req, res, false);
