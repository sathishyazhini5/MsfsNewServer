import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';

export const sharedQuickCodes = (prisma, type) => async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication is required.' });
    }
    jwt.verify(authHeader.slice(7), JWT_SECRET);
    if (req.query.quick_code_type && req.query.quick_code_type !== type) {
      return res.status(400).json({ error: 'Invalid quick_code_type' });
    }
    const rows = await prisma.quickcode_mst.findMany({
      where: { quick_code_type: type },
      select: { quick_code: true, quickcode_name: true, quick_code_type: true },
      orderBy: { quickcode_name: 'asc' },
    });
    return res.json(rows);
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Error retrieving shared quick codes:', error);
    return res.status(500).json({ error: 'Failed to retrieve quick codes' });
  }
};
