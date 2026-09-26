export const listISDCodes = async (prisma, countryCode) => {
  const countries = await prisma.countrymetadata.findMany({
    ...(countryCode ? { where: { alpha_3code: String(countryCode).trim().toUpperCase() } } : {}),
    select: { ISD_code: true },
  });
  return [...new Set(countries.map(({ ISD_code }) => ISD_code?.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .map((ISD_code) => ({ ISD_code }));
};
