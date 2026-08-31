import { PrismaClient } from '@prisma/client';
import { resolveDataScope, sendScopeError } from '../utils/dataScope.js';
import { getNotificationSummary } from '../services/notificationService.js';

const prisma = new PrismaClient();

export const notificationSummary = async (req, res) => {
  try {
    const { provinceCodes } = await resolveDataScope(req, prisma, req.query.province_code || null);
    const data = await getNotificationSummary({ prisma, provinceCodes });
    return res.status(200).json({ message: 'Notifications fetched successfully.', data });
  } catch (error) {
    return sendScopeError(res, error, 'Unable to load notifications.');
  }
};
