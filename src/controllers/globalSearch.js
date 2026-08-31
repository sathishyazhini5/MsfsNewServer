import { PrismaClient } from '@prisma/client';
import { resolveDataScope, sendScopeError } from '../utils/dataScope.js';
import { searchGlobally } from '../services/globalSearchService.js';

const prisma = new PrismaClient();

export const globalSearch = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length < 2) {
      return res.status(400).json({ error: 'Enter at least 2 characters to search.' });
    }
    if (query.length > 100) {
      return res.status(400).json({ error: 'Search text is too long.' });
    }
    const requestedProvince = req.query.province_code || null;
    const { user, provinceCodes } = await resolveDataScope(req, prisma, requestedProvince);
    const result = await searchGlobally({ prisma, query, provinceCodes, user });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Global search failed:', error.message);
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError' || error.status) {
      return sendScopeError(res, error, 'Unable to load search results.');
    }
    return res.status(500).json({ error: 'Unable to load search results.' });
  }
};
