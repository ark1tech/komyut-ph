import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
    console.log("hello");
    const { session } = await safeGetSession()

    if (!session) {
        redirect(303, '/')
    }

    console.log(session.user.id);
    const { data: user } = await supabase
        .from('user')
        .select(`full_name, email, avatar_url`)
        .eq('uid', session.user.id)
        .single()

    console.log(session.user.id);

    return { session, user }
}

// not really needed rn since we're using google signin
// export const actions: Actions = {
//   update: async ({ request, locals: { supabase, safeGetSession } }) => {
//     const formData = await request.formData()
//     const fullName = formData.get('fullName') as string
//     const username = formData.get('username') as string
//     const website = formData.get('website') as string
//     const avatarUrl = formData.get('avatarUrl') as string

//     const { session } = await safeGetSession()

//     const { error } = await supabase.from('profiles').upsert({
//       id: session?.user.id,
//       full_name: fullName,
//       username,
//       website,
//       avatar_url: avatarUrl,
//       updated_at: new Date(),
//     })

//     if (error) {
//       return fail(500, {
//         fullName,
//         username,
//         website,
//         avatarUrl,
//       })
//     }

//     return {
//       fullName,
//       username,
//       website,
//       avatarUrl,
//     }
//   },
//   signout: async ({ locals: { supabase, safeGetSession } }) => {
//     const { session } = await safeGetSession()
//     if (session) {
//       await supabase.auth.signOut()
//       redirect(303, '/')
//     }
//   },
// }