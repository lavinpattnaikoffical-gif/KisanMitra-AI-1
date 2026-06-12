const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const u = await p.user.count();
    const f = await p.farm.count();
    const z = await p.zone.count();
    const d = await p.device.count();
    const s = await p.sensorReading.count();
    
    // Also get the actual user details
    const users = await p.user.findMany({ select: { id: true, name: true, phone: true, createdAt: true }});
    const farms = await p.farm.findMany({ select: { id: true, name: true, userId: true }});
    const zones = await p.zone.findMany({ select: { id: true, name: true, farmId: true, cropType: true }});
    
    console.log(JSON.stringify({
      counts: { users: u, farms: f, zones: z, devices: d, readings: s },
      users,
      farms,
      zones,
    }, null, 2));
  } catch (e) {
    console.error('DB ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
})();
