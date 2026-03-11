import { serverSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
export async function GET(request:Request){ const url=new URL(request.url); const code=url.searchParams.get('code'); const db=await serverSupabase(); if(code&&db){const {error}=await db.auth.exchangeCodeForSession(code); if(!error) return NextResponse.redirect(new URL('/postoffice',url.origin));} return NextResponse.redirect(new URL('/?notice=auth',url.origin)); }
