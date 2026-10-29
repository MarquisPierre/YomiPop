import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Talks to the database. Import this instead of making new clients.
export const prisma = new PrismaClient({ adapter });
