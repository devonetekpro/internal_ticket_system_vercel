'use server';

import { revalidatePath } from "next/cache";

export async function handleProfileUpdate() {
    revalidatePath('/dashboard/user-management');
}
