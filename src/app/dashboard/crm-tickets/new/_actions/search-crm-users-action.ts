
'use server';

import { searchCrmUserById, searchCrmUsersByExpression } from '@/services/crm-service';

export async function searchCrmUsersAction(query: string) {
    const isNumeric = /^\d+$/.test(query);

    if (isNumeric) {
        return await searchCrmUserById(query);
    } else {
        return await searchCrmUsersByExpression(query);
    }
}
