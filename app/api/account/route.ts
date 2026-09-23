type AccountUser = {
  id: string;
  email: string;
  name: string;
};

function decodedName(headers: Headers, email: string): string {
  const raw = headers.get('oai-authenticated-user-full-name');
  const encoding = headers.get('oai-authenticated-user-full-name-encoding');
  if (raw && encoding === 'percent-encoded-utf-8') {
    try {
      return decodeURIComponent(raw);
    } catch {}
  }
  return email.split('@')[0] || 'Opera lover';
}

export async function GET(request: Request) {
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  const user: AccountUser | null = id && email
    ? {id, email, name: decodedName(request.headers, email)}
    : null;

  return Response.json(
    {user},
    {headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}},
  );
}
