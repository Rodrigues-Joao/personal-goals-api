import { createGoal } from '../../functions/create-goal'
import z from 'zod'
import type { FastifyPluginAsyncZod, ZodTypeProvider } from 'fastify-type-provider-zod'

export const createGoalRoute: FastifyPluginAsyncZod = async ( app ) =>
{
    app.post( '/goals', {
        schema: {
            body: z.object( {
                title: z.string(),
                desiredWeeklyFrequency: z.number().int().min( 1 ).max( 7 )
            } )
        }
    }, async ( request ) =>
    {
        const body = request.body
        await createGoal( body )
    } )

}

