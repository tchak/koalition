import { Context } from 'koa';

import { Conn, Environement } from './conn';

export * from './conn';
export * from './controller';

function getEnvironement(): Environement {
  const environement = process.env.NODE_ENV || 'development';
  return {
    isTest: environement === 'test',
    isDevelopment: environement === 'development',
    isProduction: environement === 'production',
  };
}

export function connFromContext(ctx: Context): Conn {
  return Object.freeze(
    Object.assign(Object.create(null), {
      halted: false,
      host: ctx.request.hostname,
      method: ctx.method,
      path: ctx.request.path,
      params: Object.freeze({
        path: Object.freeze(ctx.params),
        query: Object.freeze(ctx.query),
      }),
      headers: ctx.request.headers,
      body: ctx.request.body,
      environement: getEnvironement(),
    })
  );
}

export function contextFromConn(ctx: Context, conn: Conn): void {
  if (conn.halted) {
    ctx.status = conn.status || 200;

    if (conn.responseHeaders) {
      ctx.set(conn.responseHeaders);
    }

    if (conn.responseBody) {
      ctx.body = conn.responseBody;
    }
  }
}
