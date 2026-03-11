import type { RequestHandler } from '@sveltejs/kit';

const BACKEND_URL = 'https://trafego-eliteweb.onrender.com';

async function proxy(request: Request, path: string): Promise<Response> {
  const url = new URL(request.url);
  const target = `${BACKEND_URL}/api/${path}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (!['GET', 'HEAD'].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  return fetch(target, init);
}

export const GET: RequestHandler = ({ request, params }) => proxy(request, params.path ?? '');
export const POST: RequestHandler = ({ request, params }) => proxy(request, params.path ?? '');
export const PUT: RequestHandler = ({ request, params }) => proxy(request, params.path ?? '');
export const PATCH: RequestHandler = ({ request, params }) => proxy(request, params.path ?? '');
export const DELETE: RequestHandler = ({ request, params }) => proxy(request, params.path ?? '');
