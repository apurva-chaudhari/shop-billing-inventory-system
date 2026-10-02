const { PrismaClient } = require("@prisma/client");

// Reuse one Prisma connection across the whole app (best practice)
const prisma = new PrismaClient();

module.exports = prisma;
