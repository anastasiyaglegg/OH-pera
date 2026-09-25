import {NextResponse,type NextRequest} from 'next/server';
export function middleware(request:NextRequest){
 const dev=process.env.NODE_ENV!=='production';
 const common={
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=()',
  ...(!dev?{'Strict-Transport-Security':'max-age=31536000'}:{}),
 };
 if(request.nextUrl.pathname.startsWith('/api/')){
  const response=NextResponse.next();
  for(const [key,value] of Object.entries(common)) response.headers.set(key,value);
  return response;
 }
 const nonce=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
 const csp=["default-src 'self'","base-uri 'none'","object-src 'none'","frame-ancestors 'none'","form-action 'self'",
  `script-src 'self' ${dev?"'unsafe-inline' 'unsafe-eval'":`'nonce-${nonce}'`}`,
  "style-src 'self' 'unsafe-inline'","img-src 'self' data:","font-src 'self'",
  `connect-src 'self'${dev?' ws: wss:':''}`,"frame-src https://www.youtube.com https://www.youtube-nocookie.com",
 ].join('; ');
 const headers=new Headers(request.headers);
 // Override client-supplied CSP/nonce headers before the renderer sees them.
 headers.set('Content-Security-Policy',csp);headers.set('x-nonce',nonce);
 const response=NextResponse.next({request:{headers}});
 for(const [key,value] of Object.entries(common)) response.headers.set(key,value);
 response.headers.set('Content-Security-Policy',csp);
 response.headers.set('Cache-Control','private, no-store');
 return response;
}
export const config={matcher:['/((?!assets/|_next/|images/|fonts/|favicon.ico).*)']};
