import { Router, RouterOptions } from '@koalition/router';
import { Context, Middleware } from 'koa';
import { camelize } from 'inflected';

import {
  connFromContext,
  contextFromConn,
  ControllerClass,
} from './controller';

function normalizeControllerName(name: string): string {
  return camelize(`${name}_controller`);
}

function normalizeControllerActionName(name: string): string {
  return camelize(name, false);
}

export interface ControllerRouterOptions extends RouterOptions {
  controllers: ControllerClass[];
}

export class ControllerRouter extends Router {
  #controllers: Record<string, ControllerClass> = {};

  constructor(options?: ControllerRouterOptions) {
    super(options);

    if (options && Array.isArray(options.controllers)) {
      this.#controllers = Object.fromEntries(
        options.controllers.map((controller) => [controller.name, controller])
      );
    }
  }

  resolve(actionName: string): Middleware[] {
    let [controllerName, controllerActionName] = actionName.split('#');
    controllerName = normalizeControllerName(controllerName);
    controllerActionName = normalizeControllerActionName(controllerActionName);

    const ControllerClass = this.#controllers[controllerName];
    const action = ControllerClass.prototype[controllerActionName];

    if (!ControllerClass) {
      throw new Error(`Controller "${controllerName}" is not dfined.`);
    }

    if (!action) {
      throw new Error(
        `Action "${controllerActionName}" is not defined on the "${controllerName}" controller.`
      );
    }

    const middleware = async (ctx: Context): Promise<void> => {
      const controller = new ControllerClass(connFromContext(ctx));
      await action.call(controller);
      contextFromConn(ctx, controller.conn);
    };

    return [middleware];
  }
}
