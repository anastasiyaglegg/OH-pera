import {invitationRequest} from '../../../lib/invitation-request';
export async function POST(request:Request){
 return invitationRequest(request,{supabaseUrl:process.env.NEXT_PUBLIC_SUPABASE_URL,supabaseKey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,apiKey:process.env.RESEND_API_KEY,from:process.env.INVITATION_EMAIL_FROM,siteUrl:process.env.INVITATION_SITE_URL});
}
