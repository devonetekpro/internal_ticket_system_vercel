
'use server'

import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { getCrmManagers, type CrmManager } from '@/services/crm-service'
import type { Profile, Department } from '@/lib/database.types'

async function enrichUserProfileFromGraphAPI(accessToken: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  try {
    const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,jobTitle,department,userPrincipalName', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!graphResponse.ok) {
      console.error("Failed to fetch user from Graph API:", await graphResponse.text());
      return;
    }

    const graphData = await graphResponse.json();
    let avatarPublicUrl: string | null = null;
    
    // --- New: Upload photo to Supabase Storage ---
    try {
        const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (photoResponse.ok) {
            const imageBuffer = await photoResponse.arrayBuffer();
            const contentType = photoResponse.headers.get('content-type') || 'image/jpeg';
            const fileExt = contentType.split('/')[1] || 'jpg';
            const filePath = `public/${user.id}.${fileExt}`;

            // Upload the file to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, imageBuffer, {
                    contentType,
                    upsert: true, // Overwrite if it already exists
                });

            if (uploadError) {
                console.error('Error uploading avatar to Supabase Storage:', uploadError);
            } else {
                // Get the public URL of the uploaded file
                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);
                avatarPublicUrl = urlData.publicUrl;
            }
        }
    } catch(photoError) {
        console.warn("Could not fetch or upload user photo from Graph API:", photoError);
    }
    // --- End New Logic ---


    const newMetaData = {
      ...user.user_metadata,
      full_name: graphData.displayName,
      jobTitle: graphData.jobTitle,
      department: graphData.department,
      preferred_username: graphData.userPrincipalName,
      avatar_url: avatarPublicUrl, // Use the new public URL
    };

    const { error: updateError } = await supabase.auth.updateUser({
      data: newMetaData
    });
    if (updateError) {
      console.error('Failed to update user metadata with Graph API data:', updateError);
      return; // Stop if metadata update fails
    }

    // Now that metadata is updated, upsert the profile
    const departmentNameVar = newMetaData.department;
    let departmentIdVar: string | null = null;

    if (departmentNameVar) {
      const { data: department } = await supabase
        .from('departments')
        .select('id')
        .eq('name', departmentNameVar)
        .single();
      departmentIdVar = department?.id ?? null;
    }

    const usernameVar = newMetaData.preferred_username || user.email?.split('@')[0] || `user${user.id.substring(0, 5)}`;
    let uniqueUsername = usernameVar;
    let attempts = 0;
    
    // Ensure username is long enough
    if (uniqueUsername.length < 3) {
      uniqueUsername = `${uniqueUsername}${Math.random().toString(36).substring(2, 5)}`;
    }

    while(true) {
        const { data: existingProfile, error: existingError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', uniqueUsername)
            .single();

        if (existingError && existingError.code !== 'PGRST116') { // Don't fail on "no rows found"
            throw existingError;
        }

        if (!existingProfile) {
            break; // Username is unique
        }

        attempts++;
        uniqueUsername = `${usernameVar}_${Math.random().toString(36).substring(2, 7)}`;
        if (attempts > 5) {
            throw new Error("Failed to generate a unique username after 5 attempts.");
        }
    }
    
    const { error: profileUpsertError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            email: user.email,
            full_name: newMetaData.full_name,
            username: uniqueUsername,
            job_title: newMetaData.jobTitle,
            department_id: departmentIdVar,
            avatar_url: newMetaData.avatar_url, // Save the public URL here
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (profileUpsertError) {
      console.error('Failed to upsert user profile:', profileUpsertError);
    }


  } catch (error) {
    console.error('Error enriching user profile from Graph API:', error);
  }
}

async function syncCrmManagerId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return;
  }
  
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('crm_manager_id')
    .eq('id', user.id)
    .single();

  if (existingProfile && existingProfile.crm_manager_id) {
    return;
  }

  try {
    const managers = await getCrmManagers();
    console.log('Fetched CRM managers:', managers);
    const matchedManager = managers.find(
      (manager: CrmManager) => manager.email && user.email && manager.email.toLowerCase() === user.email.toLowerCase()
    );

    if (matchedManager) {
      const { error } = await supabase
        .from('profiles')
        .update({ crm_manager_id: matchedManager.id })
        .eq('id', user.id);

      if (error) {
        console.error('Failed to update crm_manager_id for user:', user.id, error);
      }
    }
  } catch (error) {
    console.error('Failed to sync CRM manager ID during auth callback:', error);
  }
}


export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error);
      const errorMessage = encodeURIComponent(error.message || 'Could not log in with provider.');
      return NextResponse.redirect(`${origin}/login?message=${errorMessage}`)
    }

    if (sessionData?.session?.provider_token && sessionData.session.user.app_metadata.provider === 'azure') {
      await enrichUserProfileFromGraphAPI(sessionData.session.provider_token);
    } else {
        // Handle normal email sign-up profile creation
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', user.id).single();
            if (!existingProfile) {
                 // The user does not have a profile, create one.
                const usernameVar = user.email?.split('@')[0] || `user_${user.id.substring(0, 5)}`;
                let uniqueUsername = usernameVar;
                
                if (uniqueUsername.length < 3) {
                  uniqueUsername = `${uniqueUsername}${Math.random().toString(36).substring(2, 5)}`;
                }

                let attempts = 0;
                while(true) {
                    const { data: profileCheck, error: checkError } = await supabase.from('profiles').select('id').eq('username', uniqueUsername).single();
                    if (checkError && checkError.code !== 'PGRST116') { // Don't fail on "no rows found"
                        throw checkError;
                    }
                    if (!profileCheck) break; // Username is unique
                    attempts++;
                    uniqueUsername = `${usernameVar}_${Math.random().toString(36).substring(2, 7)}`;
                    if (attempts > 5) throw new Error("Failed to generate a unique username.");
                }

                const { error: profileError } = await supabase.from('profiles').insert({
                    id: user.id,
                    email: user.email,
                    username: uniqueUsername,
                    full_name: user.user_metadata.full_name,
                    avatar_url: user.user_metadata.avatar_url,
                });

                if (profileError) {
                    console.error('Database error saving new user profile:', profileError);
                    const errorMessage = encodeURIComponent(profileError.message || 'Database error creating user profile.');
                    return NextResponse.redirect(`${origin}/login?message=${errorMessage}`);
                }
            }
        }
    }
    
    try {
        await syncCrmManagerId();
    } catch (dbError: any) {
        console.error('Database error after auth:', dbError);
        const errorMessage = encodeURIComponent(dbError.message || 'Database error processing user profile.');
        return NextResponse.redirect(`${origin}/login?message=${errorMessage}`);
    }
      
    return NextResponse.redirect(`${origin}${next}`)
  }
  
  const errorDescription = searchParams.get('error_description');
  const message = encodeURIComponent(errorDescription || 'Could not log in with provider. Please try again.');

  return NextResponse.redirect(`${origin}/login?message=${message}`)
}

    