/** Recover a PKCE return sent to Supabase's Site URL instead of the callback URL. */
export function oauthReturnPath(params: {
  code?: string | string[];
  error?: string | string[];
}): string | null {
  if (params.error) return "/?notice=auth";
  if (
    typeof params.code !== "string" ||
    !params.code.trim() ||
    params.code.length > 2048
  )
    return null;
  return `/auth/callback?${new URLSearchParams({ code: params.code })}`;
}
