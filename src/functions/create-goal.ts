import { db } from "../db";
import { goals } from "../db/schema";

type CreateGoalRequestType = {
    title: string;
    desiredWeeklyFrequency: number;



}

export async function createGoal( { title, desiredWeeklyFrequency }: CreateGoalRequestType )
{
    const result = await db.insert( goals ).values( {
        title,
        desiredWeeklyFrequency
    } ).returning()
    const goal = result[0]
    return {
        goal
    }
}