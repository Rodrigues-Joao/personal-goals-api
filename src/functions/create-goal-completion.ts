
import { db } from "../db";
import dayjs from "dayjs";

import { count, lte, and, gte, eq, sql } from "drizzle-orm";
import { goals, goalsCompletions } from "../db/schema";

type CreateGoalCompletionRequestType = {
    goalId: string;
}
export async function createGoalCompletion( {
    goalId,
}: CreateGoalCompletionRequestType )
{
    const firstDayOfWeek = dayjs().startOf( 'week' ).toDate()
    const lastDayOfWeek = dayjs().endOf( 'week' ).toDate()

    const goalCompletionCounts = db.$with( 'goal_completion_counts' ).as(
        db
            .select( {
                goalId: goalsCompletions.goalId,
                completionCount: count( goalsCompletions.id ).as( 'completionCount' ),
            } )
            .from( goalsCompletions )
            .where(
                and(
                    gte( goalsCompletions.createdAt, firstDayOfWeek ),
                    lte( goalsCompletions.createdAt, lastDayOfWeek ),
                    eq( goalsCompletions.goalId, goalId )
                )
            )
            .groupBy( goalsCompletions.goalId )
    )

    const result = await db
        .with( goalCompletionCounts )
        .select( {
            desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
            completionCount: sql /*sql*/`
        COALESCE(${ goalCompletionCounts.completionCount }, 0)
      `.mapWith( Number ),
        } )
        .from( goals )
        .leftJoin( goalCompletionCounts, eq( goalCompletionCounts.goalId, goals.id ) )
        .where( eq( goals.id, goalId ) )
        .limit( 1 )

    const { completionCount, desiredWeeklyFrequency } = result[0]

    if ( completionCount >= desiredWeeklyFrequency )
    {
        throw new Error( 'Goal already completed this week!' )
    }

    const insertResult = await db
        .insert( goalsCompletions )
        .values( { goalId } )
        .returning()
    const goalCompletion = insertResult[0]

    return {
        goalCompletion,
    }
}