import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = await updateSession(request)

  const supabase = await (await import('@/lib/supabase/server')).createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect authenticated users from login/register pages
  if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/polls';
    return NextResponse.redirect(url);
  }
  
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}