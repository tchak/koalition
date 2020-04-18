import {
  RequestParams,
  Conn,
  assign,
  header,
  headers,
  status,
  text,
  html,
  json,
  noContent,
  badRequest,
  notFound,
} from './conn';

export interface ControllerClass {
  new (conn: Conn): BaseController;
  name: string;
}

export class BaseController {
  #conn!: Conn;

  constructor(conn: Conn) {
    this.#conn = conn;
  }

  get conn(): Conn {
    return this.#conn;
  }

  get params(): RequestParams {
    return this.conn.params as RequestParams;
  }

  assign(conn: Partial<Conn>): this {
    this.#conn = assign(this.conn, conn);
    return this;
  }

  header(key: string, value: string): this {
    this.#conn = header(this.conn, key, value);
    return this;
  }

  headers(httpHeaders: Record<string, string>): this {
    this.#conn = headers(this.conn, httpHeaders);
    return this;
  }

  status(httpStatus: number): this {
    this.#conn = status(this.conn, httpStatus);
    return this;
  }

  json(body: unknown): this {
    this.#conn = json(this.conn, body);
    return this;
  }

  text(body: unknown): this {
    this.#conn = text(this.conn, body);
    return this;
  }

  html(body: unknown): this {
    this.#conn = html(this.conn, body);
    return this;
  }

  noContent(): this {
    this.#conn = noContent(this.conn);
    return this;
  }

  badRequest(message?: string): this {
    this.#conn = badRequest(this.conn, message);
    return this;
  }

  notFound(message?: string): this {
    this.#conn = notFound(this.conn, message);
    return this;
  }

  async call(actionName: string): Promise<Conn> {
    const action = this.getHandler(actionName);

    if (action) {
      await action(this.conn, this.params);
      return this.conn;
    }

    throw new Error(
      `Action "${actionName}" is not defined on the controller "${this.constructor.name}".`
    );
  }

  private getHandler(name: string): Function | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (this as any)[name];
    if (handler) {
      return handler.bind(this) as Function;
    }
  }
}
