import { NextRequest, NextResponse } from 'next/server';

export function proxy(request:NextRequest){
  const nonce=btoa(crypto.randomUUID());
  const development=process.env.NODE_ENV==='development';
  const policy=[
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development?" 'unsafe-eval'":''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(development?[]:['upgrade-insecure-requests']),
  ].join('; ');
  const requestHeaders=new Headers(request.headers);
  requestHeaders.set('x-nonce',nonce);
  requestHeaders.set('Content-Security-Policy',policy);
  const response=NextResponse.next({request:{headers:requestHeaders}});
  response.headers.set('Content-Security-Policy',policy);
  response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options','nosniff');
  response.headers.set('X-Frame-Options','DENY');
  response.headers.set('Permissions-Policy','camera=(), geolocation=(), payment=(), usb=(), microphone=(self)');
  response.headers.set('Cross-Origin-Opener-Policy','same-origin');
  response.headers.set('Cross-Origin-Resource-Policy','same-origin');
  return response;
}

export const config={matcher:[{source:'/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'}]};
