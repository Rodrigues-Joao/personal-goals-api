import dayjs from "dayjs";
import { db } from "../db";
import { count, lte, and, gte, eq, sql } from "drizzle-orm";
import { goals, goalsCompletions } from "../db/schema";



export async function getWeekPendingGoals()
{
    const firstDayOfWeek = dayjs().startOf( 'week' ).toDate()
    const lastDayOfWeek = dayjs().endOf( 'week' ).toDate()

    const goaslCreatedUpToWeek = db.$with( 'goals_created_up_to_week' ).as(
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
            .groupBy( goalsCompletions.id )
    )

    const pendingGoals = await db.with( goaslCreatedUpToWeek, goalCompletionCounts )
        .select(
            {
                id: goaslCreatedUpToWeek.id,
                title: goaslCreatedUpToWeek.title,
                desiredWeeklyFrequency: goaslCreatedUpToWeek.desiredWeeklyFrequency,
                completationCount: sql`COALESCE(${ goalCompletionCounts.completionCount },0)`.mapWith( Number )

            }
        )
        .from( goaslCreatedUpToWeek )
        .leftJoin( goalCompletionCounts, eq( goalCompletionCounts.goalId, goaslCreatedUpToWeek.id ) )


    return {
        pendingGoals
    }
}