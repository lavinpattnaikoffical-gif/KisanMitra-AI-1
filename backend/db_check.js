const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const farm = await p.farm.findFirst({
      include: {
        zones: {
          include: {
            devices: { select: { id: true, deviceId: true, type: true, role: true, status: true, lastSeen: true }},
            _count: { select: { sensorReadings: true }}
          }
        }
      }
    });
    console.log(JSON.stringify(farm, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
})();
