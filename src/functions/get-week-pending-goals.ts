import dayjs from "dayjs";
import { db } from "../db";
import { count, lte, and, gte, eq, sql } from "drizzle-orm";
import { goals, goalsCompletions } from "../db/schema";



export async function getWeekPendingGoals()
{
    const firstDayOfWeek = dayjs().startOf( 'week' ).toDate()
    const lastDayOfWeek = dayjs().endOf( 'week' ).toDate()

    const goalsCreatedUpToWeek = db.$with( 'goals_created_up_to_week' ).as(
        db.select(
            {
                id: goals.id,
                title: goals.title,
                desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
                createdAt: goals.createdAt
            }
        )
            .from( goals )
            .where( lte( goals.createdAt, lastDayOfWeek ) )
    )

    const goalCompletionCounts = db.$with( 'goal_completion_counts' ).as(
        db.select( {
            goalId: goalsCompletions.goalId,
            completionCount: count( goalsCompletions.id ).as( 'completionCount' )
        } )
            .from( goalsCompletions )
            .where( and(
                gte( goalsCompletions.createdAt, firstDayOfWeek ),
                lte( goalsCompletions.createdAt, lastDayOfWeek )

            ) )
            .groupBy( goalsCompletions.goalId )
    )

    const pendingGoals = await db.with( goalsCreatedUpToWeek, goalCompletionCounts )
        .select(
            {
                id: goalsCreatedUpToWeek.id,
                title: goalsCreatedUpToWeek.title,
                desiredWeeklyFrequency: goalsCreatedUpToWeek.desiredWeeklyFrequency,
                completionCount: sql`COALESCE(${ goalCompletionCounts.completionCount },0)`.mapWith( Number )

            }
        )
        .from( goalsCreatedUpToWeek )
        .leftJoin( goalCompletionCounts, eq( goalCompletionCounts.goalId, goalsCreatedUpToWeek.id ) )


    return {
        pendingGoals
    }
}