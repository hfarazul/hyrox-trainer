import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  analyzeRecentPerformance,
  calculateRaceReadiness,
  CompletedWorkoutData,
  PerformanceAnalysis,
  RaceReadinessScore,
} from '@/lib/performance-analyzer';

interface AnalysisResponse {
  analysis: PerformanceAnalysis;
  raceReadiness: RaceReadinessScore;
  programProgress: {
    currentWeek: number;
    totalWeeks: number;
    completedWorkouts: number;
    totalWorkouts: number;
  };
}

/**
 * GET /api/user-program/analysis
 * Returns performance analysis and race readiness score for the user's current program
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current program with completed workouts
    const userProgram = await prisma.userProgram.findUnique({
      where: { userId: session.user.id },
      include: {
        completedWorkouts: {
          orderBy: { completedAt: 'asc' },
        },
      },
    });

    if (!userProgram) {
      return NextResponse.json({ error: 'No active program found' }, { status: 404 });
    }

    // Parse program data to get total workouts and structure
    interface ProgramWeek {
      workouts?: Array<{
        type?: string;
        dayOfWeek?: number;
        params?: { coverage?: number };
      }>;
    }
    interface ParsedProgramData {
      weeks?: ProgramWeek[];
    }

    let programData: ParsedProgramData | null = null;
    let totalWorkouts = 0;
    let totalWeeks = 0;
    let keyWorkoutsTotal = 0;

    if (userProgram.programData) {
      try {
        programData = JSON.parse(userProgram.programData) as ParsedProgramData;
        if (programData?.weeks && Array.isArray(programData.weeks)) {
          totalWeeks = programData.weeks.length;
          programData.weeks.forEach((week) => {
            if (week.workouts && Array.isArray(week.workouts)) {
              // Count non-rest workouts
              const nonRestWorkouts = week.workouts.filter(
                (w) => w.type !== 'rest'
              );
              totalWorkouts += nonRestWorkouts.length;

              // Count key workouts (full simulations and high coverage)
              const keyWorkouts = week.workouts.filter(
                (w) =>
                  w.type === 'full' ||
                  (w.type === 'coverage' && w.params?.coverage && w.params.coverage >= 75)
              );
              keyWorkoutsTotal += keyWorkouts.length;
            }
          });
        }
      } catch {
        // If parsing fails, use defaults
        totalWeeks = 8;
        totalWorkouts = 40; // Rough estimate
      }
    }

    // Calculate current week
    const startDate = new Date(userProgram.startDate);
    const now = new Date();
    const daysSinceStart = Math.floor(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const currentWeek = Math.min(Math.floor(daysSinceStart / 7) + 1, totalWeeks);

    // Transform completed workouts for analyzer
    const completedWorkoutsData: CompletedWorkoutData[] = userProgram.completedWorkouts.map(cw => ({
      week: cw.week,
      dayOfWeek: cw.dayOfWeek,
      completedAt: cw.completedAt.toISOString(),
      actualDuration: cw.actualDuration,
      rpe: cw.rpe,
      completionStatus: cw.completionStatus,
      percentComplete: cw.percentComplete,
    }));

    // Count key workouts completed (full simulations and coverage >= 75%)
    // For now, estimate based on workout types if we have program data
    let keyWorkoutsCompleted = 0;
    if (programData?.weeks) {
      userProgram.completedWorkouts.forEach(cw => {
        const weekData = programData!.weeks![cw.week - 1];
        if (weekData?.workouts) {
          const dayWorkout = weekData.workouts.find(
            (w) => w.dayOfWeek === cw.dayOfWeek
          );
          if (
            dayWorkout &&
            (dayWorkout.type === 'full' ||
              (dayWorkout.type === 'coverage' && dayWorkout.params?.coverage && dayWorkout.params.coverage >= 75))
          ) {
            keyWorkoutsCompleted++;
          }
        }
      });
    }

    // Calculate weeks until race
    let weeksUntilRace: number | null = null;
    if (userProgram.raceDate) {
      const raceDate = new Date(userProgram.raceDate);
      const daysUntilRace = Math.floor(
        (raceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      weeksUntilRace = Math.max(0, Math.ceil(daysUntilRace / 7));
    }

    // Calculate scheduled workouts up to current week
    let scheduledToDate = 0;
    if (programData?.weeks) {
      for (let i = 0; i < currentWeek && i < programData.weeks.length; i++) {
        const week = programData.weeks[i] as { workouts?: { type?: string }[] };
        if (week.workouts) {
          scheduledToDate += week.workouts.filter(
            (w: { type?: string }) => w.type !== 'rest'
          ).length;
        }
      }
    } else {
      // Estimate ~5 workouts per week if no program data
      scheduledToDate = currentWeek * 5;
    }

    // Run analysis
    const analysis = analyzeRecentPerformance(
      completedWorkoutsData,
      scheduledToDate,
      currentWeek
    );

    const raceReadiness = calculateRaceReadiness(
      completedWorkoutsData,
      scheduledToDate,
      keyWorkoutsCompleted,
      Math.ceil(keyWorkoutsTotal * (currentWeek / totalWeeks)), // Key workouts expected by now
      weeksUntilRace,
      currentWeek
    );

    const response: AnalysisResponse = {
      analysis,
      raceReadiness,
      programProgress: {
        currentWeek,
        totalWeeks,
        completedWorkouts: userProgram.completedWorkouts.length,
        totalWorkouts: scheduledToDate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error analyzing performance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
