
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export const getBloodGroupNames = async (req, res) => {
  try {
    const bloodGroups = await prisma.bloodgroup_metadata.findMany({
      select: {
        bloodgroup: true
      }
    });
    console.log(bloodGroups)

    if (bloodGroups.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    res.json(bloodGroups);
  } catch (error) {
    console.error('Error retrieving blood group names:', error);
    res.status(500).json({ error: 'Failed to retrieve blood group names' });
  }
}


