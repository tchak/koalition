import { RouterContext } from 'koa-router';
import { DefaultState, DefaultContext } from 'koa';

export interface RequestParams {
  path: Record<string, unknown>;
  query: Record<string, unknown>;
}

export interface ControllerClass<
  State = DefaultState,
  Custom = DefaultContext
> {
  new (ctx: RouterContext<State, Custom>): BaseController<State, Custom>;
  name: string;
}

export class BaseController<State = DefaultState, Custom = DefaultContext> {
  #ctx!: RouterContext<State, Custom>;

  constructor(ctx: RouterContext<State, Custom>) {
    this.#ctx = ctx;
  }

  get ctx(): RouterContext<State, Custom> {
    return this.#ctx;
  }

  get params(): RequestParams {
    return Object.freeze({
      path: Object.freeze(this.ctx.params),
      query: Object.freeze(this.ctx.query),
    });
  }

  header(key: string, value: string): this {
    this.#ctx.set(key, value);

    return this;
  }

  headers(headers: Record<string, string>): this {
    this.#ctx.set(headers);

    return this;
  }

  status(status: number): this {
    if (!this.#ctx.status) {
      this.#ctx.status = status;
    }

    return this;
  }

  json(body: unknown): this {
    this.status(200);

    this.#ctx.body = body;
    this.#ctx.type = 'json';

    return this;
  }

  text(body: unknown): this {
    this.status(200);

    this.#ctx.body = body;
    this.#ctx.type = 'text';

    return this;
  }

  html(body: unknown): this {
    this.status(200);

    this.#ctx.body = body;
    this.#ctx.type = 'html';

    return this;
  }

  noContent(): this {
    this.status(204);

    return this;
  }

  badRequest(message?: string): this {
    this.status(400);

    if (message) {
      this.#ctx.body = message;
    }

    return this;
  }

  notFound(message?: string): this {
    this.status(404);

    if (message) {
      this.#ctx.body = message;
    }

    return this;
  }
}
