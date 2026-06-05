'use server';

import { login, logout, isPasswordConfigured } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function loginAction(password: string) {
  try {
    const success = await login(password);
    if (success) {
      revalidatePath('/');
      revalidatePath('/library');
      revalidatePath('/templates');
      return { success: true };
    }
    return { success: false, error: 'Incorrect password.' };
  } catch (error) {
    console.error('Login action error:', error);
    return { success: false, error: 'An error occurred during login.' };
  }
}

export async function logoutAction() {
  try {
    await logout();
    revalidatePath('/');
    revalidatePath('/library');
    revalidatePath('/templates');
    return { success: true };
  } catch (error) {
    console.error('Logout action error:', error);
    return { success: false, error: 'An error occurred during logout.' };
  }
}

export async function isPasswordConfiguredAction() {
  return isPasswordConfigured();
}
