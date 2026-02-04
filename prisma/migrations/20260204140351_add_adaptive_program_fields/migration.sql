-- AlterTable
ALTER TABLE "CompletedProgramWorkout" ADD COLUMN     "actualDuration" INTEGER,
ADD COLUMN     "completionStatus" TEXT NOT NULL DEFAULT 'full',
ADD COLUMN     "percentComplete" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "performanceData" TEXT,
ADD COLUMN     "rpe" INTEGER;

-- AlterTable
ALTER TABLE "UserProgram" ADD COLUMN     "adaptedSchedule" TEXT,
ADD COLUMN     "intensityModifier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "missedWorkoutCount" INTEGER NOT NULL DEFAULT 0;
