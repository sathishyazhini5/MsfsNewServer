import { Prisma } from '@prisma/client';

const MAX_SEQUENCE = 999;
const MAX_RETRIES = 3;

export class ConfrereCreationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ConfrereCreationError';
    this.status = status;
  }
}

const normalizeProvinceShortName = (value) => {
  const shortName = String(value || '').trim().toUpperCase();
  if (!/^[A-Z]{2,5}$/.test(shortName)) {
    throw new ConfrereCreationError('Province short name must contain 2 to 5 letters.');
  }
  return shortName;
};

export const getOrdinationYear = (value) => {
  if (!value) throw new ConfrereCreationError('Ordination date is required to generate Confrere ID.');
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ConfrereCreationError('A valid ordination date is required to generate Confrere ID.');
  }
  const year = date.getUTCFullYear();
  if (year < 1000 || year > 9999) {
    throw new ConfrereCreationError('Ordination date must contain a valid four-digit year.');
  }
  return year;
};

const allocateSequence = async (tx, provinceCode, year) => {
  const allocated = await tx.$queryRaw`
    INSERT INTO "confrere_code_counter"
      ("province_code", "ordination_year", "last_sequence", "updated_date")
    VALUES (${provinceCode}, ${year}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("province_code", "ordination_year") DO UPDATE
      SET "last_sequence" = "confrere_code_counter"."last_sequence" + 1,
          "updated_date" = CURRENT_TIMESTAMP
      WHERE "confrere_code_counter"."last_sequence" < ${MAX_SEQUENCE}
    RETURNING "last_sequence"
  `;
  if (!allocated.length) {
    throw new ConfrereCreationError(
      `Confrere ID sequence limit reached for ${provinceCode}/${year}.`,
      409
    );
  }
  return allocated[0].last_sequence;
};

export const createConfrereWithGeneratedCode = async ({
  prisma,
  province,
  ordinationDate,
  data,
  role,
  source,
}) => {
  const provinceCode = province?.province_code;
  if (!provinceCode) throw new ConfrereCreationError('Province is required.');
  const shortName = normalizeProvinceShortName(province.short_name);
  const year = getOrdinationYear(ordinationDate);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        let sequence;
        let confrerCode;

        // A global uniqueness check also handles two Provinces that happen to
        // share a short name. The database unique index remains final authority.
        do {
          sequence = await allocateSequence(tx, provinceCode, year);
          confrerCode = `${shortName}${year}${String(sequence).padStart(3, '0')}`;
          if (confrerCode.length > 15) {
            throw new ConfrereCreationError('Generated Confrere ID exceeds the supported length.');
          }
        } while (await tx.confreres_dtl.findFirst({ where: { confrer_code: confrerCode } }));

        const created = await tx.confreres_dtl.create({
          data: { ...data, confrer_code: confrerCode, province_code: provinceCode },
        });

        console.info('[CONFRERE ID]', {
          role,
          provinceCode,
          provinceShortName: shortName,
          ordinationYear: year,
          allocatedSequence: sequence,
          generatedCode: confrerCode,
          source,
        });
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error?.code === 'P2002' || error?.code === 'P2034';
      if (!retryable || attempt === MAX_RETRIES) {
        if (error instanceof ConfrereCreationError) throw error;
        if (retryable) {
          throw new ConfrereCreationError('Unable to generate a unique Confrere ID. Please retry.', 409);
        }
        throw error;
      }
    }
  }
  throw new ConfrereCreationError('Unable to generate a unique Confrere ID. Please retry.', 409);
};

export const resolveAuthorizedProvince = async ({ prisma, user, requestedProvince }) => {
  const role = String(user?.role_name || '').trim().toLowerCase();
  const requested = String(requestedProvince || '').trim();
  const provinceSelector = requested
    ? { OR: [{ province_code: requested }, { province_name: { equals: requested, mode: 'insensitive' } }] }
    : null;

  if (role === 'province admin') {
    const province = await prisma.province_mst.findFirst({
      where: user.province_code
        ? { province_code: user.province_code }
        : { province_name: { equals: user.province_name || '', mode: 'insensitive' } },
    });
    if (!province) throw new ConfrereCreationError('Authenticated Province was not found.', 403);
    if (requested && requested !== province.province_code && requested.toLowerCase() !== province.province_name.toLowerCase()) {
      throw new ConfrereCreationError('Selected Province is not authorized for this user.', 403);
    }
    return province;
  }

  if (role === 'congregation admin') {
    if (!requested) throw new ConfrereCreationError('Province is required.');
    const province = await prisma.province_mst.findFirst({
      where: { AND: [provinceSelector, { concretion_code: user.concretion_code || '' }] },
    });
    if (!province) throw new ConfrereCreationError('Selected Province is not authorized for this user.', 403);
    return province;
  }

  if (role === 'super admin') {
    if (!requested) throw new ConfrereCreationError('Province is required.');
    const province = await prisma.province_mst.findFirst({ where: provinceSelector });
    if (!province || province.province_code === 'ALL') {
      throw new ConfrereCreationError('Selected Province is invalid.', 400);
    }
    return province;
  }

  throw new ConfrereCreationError('This role is not authorized to create Confreres.', 403);
};
