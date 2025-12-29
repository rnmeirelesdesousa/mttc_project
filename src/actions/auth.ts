'use server';

import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';

// Access the raw postgres client for querying auth.users
// (since Drizzle schema only references id for foreign key)
// The postgres library handles connection pooling automatically
function getRawClient(): postgres.Sql {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  // Create a client for raw SQL queries (pooling handled by postgres library)
  return postgres(process.env.DATABASE_URL);
}

/**
 * Pure Mock Login Action
 * 
 * Authenticates a user by:
 * 1. Querying auth.users for email match
 * 2. Verifying password using pgcrypto.crypt()
 * 3. Retrieving role from public.profiles
 * 4. Setting mock-session cookie with user UUID
 * 
 * @param formData - FormData containing 'email' and 'password' fields
 * @returns Standardized response: { success: true, role: string } or { success: false, error: string }
 */
export async function loginUser(
  formData: FormData
): Promise<{ success: true; role: string } | { success: false; error: string }> {
  try {
    // Extract email and password from FormData
    const email = formData.get('email');
    const password = formData.get('password');

    // Validate input
    if (!email || typeof email !== 'string') {
      return { success: false, error: 'Email is required' };
    }
    if (!password || typeof password !== 'string') {
      return { success: false, error: 'Password is required' };
    }

    // Query auth.users using raw SQL (since schema only has id reference)
    // Verify password using pgcrypto.crypt() in the WHERE clause
    const rawClient = getRawClient();
    
    type UserRow = {
      id: string;
      email: string;
      encrypted_password: string;
    };
    
    const userResult = await rawClient<UserRow[]>`
      SELECT id, email, encrypted_password
      FROM auth.users
      WHERE email = ${email}
        AND encrypted_password = crypt(${password}, encrypted_password)
      LIMIT 1
    `;

    // Check if user exists and password is valid
    if (!userResult || userResult.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const user = userResult[0];
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Retrieve user's role from public.profiles using Drizzle select
    const profileResult = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    
    const profile = profileResult[0];

    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    // Set the mock-session cookie with user's UUID
    const cookieStore = await cookies();
    cookieStore.set('mock-session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Return success with role
    return { success: true, role: profile.role };
  } catch (error) {
    console.error('[loginUser]:', error);
    return { success: false, error: 'An error occurred during login' };
  }
}

