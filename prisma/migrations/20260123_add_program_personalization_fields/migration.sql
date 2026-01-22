-- AlterTable
ALTER TABLE "UserProgram" ADD COLUMN "raceDate" TIMESTAMP(3);
ALTER TABLE "UserProgram" ADD COLUMN "fitnessLevel" TEXT DEFAULT 'intermediate';
ALTER TABLE "UserProgram" ADD COLUMN "daysPerWeek" INTEGER DEFAULT 4;
ALTER TABLE "UserProgram" ADD COLUMN "weakStations" TEXT;
ALTER TABLE "UserProgram" ADD COLUMN "programData" TEXT;
