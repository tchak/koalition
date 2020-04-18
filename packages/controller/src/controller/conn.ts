export interface Environement {
  isTest: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
}

export interface RequestParams {
  path: Record<string, unknown>;
  query: Record<string, unknown>;
}

export interface RequestConn<T = unknown> {
  host: string;
  method: string;
  path: string;
  params: RequestParams;
  headers: Record<string, string | string[] | undefined>;
  body: T;
}

export interface ResponseConn<T, K = unknown> extends RequestConn<T> {
  status: number;
  responseHeaders: Record<string, string>;
  responseBody: K;
}

export interface Conn<T = unknown, K = unknown>
  extends Partial<ResponseConn<T, K>> {
  environement: Environement;
  halted: boolean;
}

const ASSIGNABLE_CONN_PROPERTIES = [
  'status',
  'responseHeaders',
  'responseBody',
  'halted',
];

export function assign(conn: Conn, updatedConn: Partial<Conn>): Conn {
  if (conn.halted) {
    throw new Error('Conn is halted!');
  }
  const newConn = Object.assign(Object.create(null), conn);
  const entries = Object.entries(updatedConn).filter(([key]) =>
    ASSIGNABLE_CONN_PROPERTIES.includes(key)
  );

  for (const [key, value] of entries) {
    if (key === 'responseHeaders') {
      const headers = Object.assign(
        Object.create(null),
        newConn.responseHeaders,
        value
      );
      Object.assign(newConn, { [key]: Object.freeze(headers) });
    } else {
      Object.assign(newConn, { [key]: Object.freeze(value) });
    }
  }

  return Object.freeze(newConn);
}

export function header(conn: Conn, key: string, value: string): Conn {
  return assign(conn, { responseHeaders: { [key]: value } });
}

export function headers(
  conn: Conn,
  responseHeaders: Record<string, string>
): Conn {
  return assign(conn, { responseHeaders });
}

export function json(conn: Conn, body: unknown): Conn {
  return assign(conn, {
    halted: true,
    responseHeaders: {
      'content-type': 'application/json',
    },
    responseBody: JSON.stringify(body),
  });
}

export function text(conn: Conn, body: unknown): Conn {
  return assign(conn, {
    halted: true,
    responseHeaders: {
      'content-type': 'text/plain',
    },
    responseBody: String(body),
  });
}

export function html(conn: Conn, body: unknown): Conn {
  return assign(conn, {
    halted: true,
    responseHeaders: {
      'content-type': 'text/html',
    },
    responseBody: body,
  });
}

export function status(conn: Conn, status: number): Conn {
  return assign(conn, { status });
}

export function noContent(conn: Conn): Conn {
  return assign(conn, { status: 204, halted: true });
}

export function badRequest(conn: Conn, message = 'Bad Request'): Conn {
  return assign(conn, {
    status: 400,
    responseBody: message,
    halted: true,
  });
}

export function notFound(conn: Conn, message = 'Not Found'): Conn {
  return assign(conn, {
    status: 404,
    responseBody: message,
    halted: true,
  });
}
