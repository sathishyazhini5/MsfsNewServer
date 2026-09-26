// Use profile dates for both dashboard totals and drill-down lists.
export const scholasticVowsWhere = (type, scope = {}) => {
  if (!['SCHOLASTIC_TEMPORARY', 'SCHOLASTIC_PERPETUAL'].includes(type)) {
    throw new Error(`Unknown scholastic vows type: ${type}`);
  }
  return {
    ...scope,
    is_active: true,
    ...(type === 'SCHOLASTIC_PERPETUAL'
      ? { final_profession_date: { not: null } }
      : { first_profession_date: { not: null }, final_profession_date: null }),
  };
};

export const countScholasticVows = async (prisma, scope = {}) => {
  const [firstProfessionCount, finalProfessionCount] = await Promise.all([
    prisma.scholastics_dtl.count({ where: scholasticVowsWhere('SCHOLASTIC_TEMPORARY', scope) }),
    prisma.scholastics_dtl.count({ where: scholasticVowsWhere('SCHOLASTIC_PERPETUAL', scope) }),
  ]);
  return { firstProfessionCount, finalProfessionCount };
};
