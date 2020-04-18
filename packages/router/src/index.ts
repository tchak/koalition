import { Middleware } from 'koa';
import KoaRouter, { IRouterOptions as RouterOptions } from 'koa-router';

export { RouterOptions };

function makeArray<T>(maybeArray: T | T[]): T[] {
  if (Array.isArray(maybeArray)) {
    return maybeArray;
  }
  return [maybeArray];
}

export interface MatchOptions {
  via?: string | string[];
  name?: string;
}

export abstract class BaseRouter<
  State = unknown,
  Custom = unknown
> extends KoaRouter<State, Custom> {
  map(to: string, options?: MatchOptions): this {
    const via = (options && options.via) || 'GET';
    const [path, actionName] = to.split('=>').map((part) => part.trim());
    const middlewares = this.resolve(actionName);
    const name = (options && options.name) as string;

    this.register(`/${path}`, makeArray(via), middlewares, { name });

    return this;
  }

  abstract resolve(actionName: string): Middleware[];
}

export interface ResourceRouterOptions<State = unknown, Custom = unknown>
  extends RouterOptions {
  router: BaseRouter<State, Custom>;
  resourceName: string;
}

export class ResourceRouter<
  State = unknown,
  Custom = unknown
> extends BaseRouter<State, Custom> {
  #router: BaseRouter<State, Custom>;
  #resourceName: string;

  constructor(options: ResourceRouterOptions<State, Custom>) {
    super(options);
    this.#router = options.router;
    this.#resourceName = options.resourceName;
  }

  member(memberName: string, options?: MatchOptions): this {
    const path = `/:id/${memberName}`;

    this.map(`${path} => ${this.#resourceName}#${memberName}`, options);

    return this;
  }

  collection(collectionName: string, options?: MatchOptions): this {
    const path = `/${collectionName}`;

    this.map(`${path} => ${this.#resourceName}#${collectionName}`, options);

    return this;
  }

  resolve(actionName: string): Middleware[] {
    return this.#router.resolve(actionName);
  }
}

const RESOURCES_OPERATIONS_MAP: Record<string, [string[], string]> = {
  create: [['POST'], '/'],
  index: [['GET'], '/'],
  show: [['GET'], '/:id'],
  update: [['PATCH', 'PUT'], '/:id'],
  destroy: [['DELETE'], '/:id'],
};

const RESOURCE_OPERATIONS_MAP: Record<string, [string[], string]> = {
  create: [['POST'], '/'],
  show: [['GET'], '/'],
  update: [['PATCH', 'PUT'], '/'],
  destroy: [['DELETE'], '/'],
};

export interface ResourceOptions {
  only?: string[];
  except?: string[];
  singleton?: boolean;
}

export type RouterBlock<State = unknown, Custom = unknown> = (
  router: ResourceRouter<State, Custom>
) => void;

export abstract class Router<
  State = unknown,
  Custom = unknown
> extends BaseRouter<State, Custom> {
  resources(
    resourceName: string,
    options?: ResourceOptions | RouterBlock<State, Custom>,
    block?: RouterBlock<State, Custom>
  ): this {
    const router = new ResourceRouter<State, Custom>({
      router: this,
      resourceName,
      prefix: `/${resourceName}`,
    });

    if (typeof options === 'function') {
      block = options;
      options = {};
    }

    const actionsMap =
      options && options.singleton
        ? RESOURCE_OPERATIONS_MAP
        : RESOURCES_OPERATIONS_MAP;

    for (const [operationName, [via, path]] of Object.entries(actionsMap)) {
      if (this.shouldMapOperation(operationName, options)) {
        this.map(`${path} => ${resourceName}#${operationName}`, { via });
      }
    }

    if (block) {
      block(router);
    }

    this.use(router.routes(), router.allowedMethods());

    return this;
  }

  resource(
    resourceName: string,
    options?: ResourceOptions | RouterBlock<State, Custom>,
    block?: RouterBlock<State, Custom>
  ): this {
    if (typeof options === 'function') {
      block = options;
      options = {};
    }
    return this.resources(resourceName, { ...options, singleton: true }, block);
  }

  private shouldMapOperation(
    operationName: string,
    options?: ResourceOptions
  ): boolean {
    if (options && options.only) {
      return options.only.includes(operationName);
    } else if (options && options.except) {
      return !options.except.includes(operationName);
    }
    return true;
  }
}
