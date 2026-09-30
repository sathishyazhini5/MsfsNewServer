import { PrismaClient } from '@prisma/client';
import { officeCategories } from '../../utils/officeTypes.js';
import { sendScopeError } from '../../utils/dataScope.js';
const prisma = new PrismaClient();

export async function officePermissions(user) {
  if (['super admin', 'province admin', 'congregation admin', 'concretion admin'].includes(String(user?.role_name).trim().toLowerCase())) {
    return { add: true, edit: true };
  }
  const rows = user?.user_id ? await prisma.user_role_com_activity_mst.findMany({ where: {
    user_id: user.user_id, role_code: user.role_code,
    component_name: { equals: 'Quick Master', mode: 'insensitive' },
  } }) : [];
  return { add: rows.some(row => row.add_flag), edit: rows.some(row => row.edit_flag) };
}

export async function getOfficeTypes(req, res) {
  try {
    const categories = await officeCategories(prisma);
    const rows = await prisma.quickcode_mst.findMany({ where: { quick_code_type: { in: Object.values(categories) } }, orderBy: { quickcode_name: 'asc' } });
    res.json({ categories, permissions: await officePermissions(res.locals.user),
      pcic: rows.filter(row => row.quick_code_type === categories.pcic),
      gcic: rows.filter(row => row.quick_code_type === categories.gcic) });
  } catch (error) { return sendScopeError(res, error, 'Unable to load office types.'); }
}

export async function saveOfficeType(req, res) {
  try {
    const action = req.method === 'PUT' ? 'edit' : 'add';
    if (!(await officePermissions(res.locals.user))[action]) return res.status(403).json({ error: 'You do not have permission to change office types.' });
    const categories = await officeCategories(prisma);
    const type = categories[req.params.kind];
    if (!type) return res.status(400).json({ error: 'Invalid office category.' });
    const name = typeof req.body.quickcode_name === 'string' ? req.body.quickcode_name.trim() : '';
    if (!name || name.length > 100) return res.status(400).json({ error: 'Name must contain 1 to 100 characters.' });
    const result = await prisma.$transaction(async tx => {
      // Serialize name checks and code allocation across all writers on this endpoint.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${type}))`;
      const duplicate = await tx.quickcode_mst.findFirst({ where: { quick_code_type: type, quickcode_name: { equals: name, mode: 'insensitive' }, ...(action === 'edit' ? { quick_code: { not: req.params.code } } : {}) } });
      if (duplicate) throw Object.assign(new Error('This office type already exists.'), { status: 409 });
      if (action === 'edit') return tx.quickcode_mst.update({ where: { quick_code_type_quick_code: { quick_code_type: type, quick_code: req.params.code } }, data: { quickcode_name: name, updated_by: res.locals.user.user_id, updated_date: new Date() } });
      const codes = await tx.quickcode_mst.findMany({ where: { quick_code_type: type }, select: { quick_code: true } });
      const sequence = 1 + Math.max(0, ...codes.map(row => Number(row.quick_code.match(/(\d+)$/)?.[1] || 0)));
      const code = `${req.params.kind.toUpperCase()}${String(sequence).padStart(3, '0')}`;
      if (code.length > 10) throw Object.assign(new Error('Office code sequence is exhausted.'), { status: 409 });
      return tx.quickcode_mst.create({ data: { quick_code_type: type, quick_code: code, quickcode_name: name, language_code: 'en', created_by: res.locals.user.user_id, created_date: new Date(), concurrency_val: 1 } });
    });
    res.status(action === 'add' ? 201 : 200).json(result);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Office type no longer exists.' });
    return sendScopeError(res, error, 'Unable to save office type.');
  }
}

// Legacy category-specific dialogs use these generic endpoints too.
export async function routeOfficeMutation(req, res, next) {
  try {
    const categories = await officeCategories(prisma);
    const kind = Object.keys(categories).find(key => categories[key] === req.body.quick_code_type);
    if (!kind) return next();
    req.params.kind = kind;
    req.params.code = req.body.quick_code;
    return saveOfficeType(req, res);
  } catch (error) { return sendScopeError(res, error, 'Unable to authorize office changes.'); }
}
