import { PrismaClient } from '@prisma/client';
import { recordWhere } from '../utils/recordAccess.js';
import { resolveDataScope, sendScopeError } from '../utils/dataScope.js';
const prisma = new PrismaClient();

export async function curiaAccess(req, res, next) {
  try {
    const where = await recordWhere(req, prisma, { curia_code: req.params.curia_code }, { gcicRead: true });
    const rows = await prisma.curia_advisors_dtl.findMany({ where, take: 2 });
    if (!rows.length) return res.status(404).json({ error: 'Curia record was not found or is outside your authorized scope.' });
    if (rows.length > 1) return res.status(400).json({ error: 'Specify the complete Curia record key.' });
    if (req.method !== 'GET' && req.body?.province_code) await resolveDataScope(req, prisma, req.body.province_code);
    req.curiaRecord = rows[0];
    next();
  } catch (error) { return sendScopeError(res, error, 'Unable to authorize Curia access.'); }
}
