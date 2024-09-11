import dayjs from "dayjs";
import { db } from "../db";
import { count, lte, and, gte, eq, sql } from "drizzle-orm";
import { goals, goalsCompletions } from "../db/schema";




export async function getWeekSummary()
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

    const goalsCompletedInWeek = db.$with( 'goals_completed_week' ).as(
        db.select( {
            id: goalsCompletions.id,
            title: goals.title,
            completedAt: goalsCompletions.createdAt,
            completedAtDate: sql`
            DATE(${ goalsCompletions.createdAt })
            `.as( 'completedAtDate' )

        } )
            .from( goalsCompletions )
            .innerJoin( goals, eq( goals.id, goalsCompletions.goalId ) )
            .where( and(
                gte( goalsCompletions.createdAt, firstDayOfWeek ),
                lte( goalsCompletions.createdAt, lastDayOfWeek )

            ) )

    )

    const goalsCompletedByWeekDay = db.$with( 'goals_completed_by_week_day' ).as(
        db.select(
            {
                completedAtDate: goalsCompletedInWeek.completedAtDate,
                completions: sql`
                        JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'id', ${ goalsCompletedInWeek.id },
                                'title', ${ goalsCompletedInWeek.title },
                                'completedAt', ${ goalsCompletedInWeek.completedAt }
                            )
                        )
                `.as( 'completions' )
            }

        )
            .from( goalsCompletedInWeek )
            .groupBy( goalsCompletedInWeek.completedAtDate )
    )

    const summary = await db
        .with( goaslCreatedUpToWeek, goalsCompletedInWeek, goalsCompletedByWeekDay )
        .select(
            {
                completed: sql`(SELECT COUNT (*) FROM ${ goalsCompletedInWeek })`.mapWith( Number ),
                total: sql`(SELECT SUM (${ goaslCreatedUpToWeek.desiredWeeklyFrequency }) FROM ${ goaslCreatedUpToWeek })`.mapWith( Number ),
                goalsPerDay: sql`
                JSON_AGG(
                   JSON_BUILD_OBJECT(
                                'date', ${ goalsCompletedByWeekDay.completedAtDate },
                                'completions', ${ goalsCompletedByWeekDay.completions }
                             
                            )
                )
                `

            }
        )
        .from( goalsCompletedByWeekDay )

    return {
        summary
    }
}