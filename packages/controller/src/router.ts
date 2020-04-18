import { DefaultState, DefaultContext } from 'koa';
import { camelize } from 'inflected';
import {
  Router,
  RouterOptions,
  Middleware,
  RouterContext,
} from '@koalition/router';

import { ControllerClass } from './controller';

function normalizeControllerName(name: string): string {
  return camelize(`${name}_controller`);
}

function normalizeControllerActionName(name: string): string {
  return camelize(name, false);
}

export interface ControllerRouterOptions<
  State = DefaultState,
  Custom = DefaultContext
> extends RouterOptions {
  controllers: ControllerClass<State, Custom>[];
}

export class ControllerRouter<
  State = DefaultState,
  Custom = DefaultContext
> extends Router<State, Custom> {
  #controllers: Record<string, ControllerClass<State, Custom>> = {};

  constructor(options?: ControllerRouterOptions<State, Custom>) {
    super(options);

    if (options && Array.isArray(options.controllers)) {
      this.#controllers = Object.fromEntries(
        options.controllers.map((controller) => [controller.name, controller])
      );
    }
  }

  resolve(actionName: string): Middleware<State, Custom>[] {
    let [controllerName, controllerActionName] = actionName.split('#');
    controllerName = normalizeControllerName(controllerName);
    controllerActionName = normalizeControllerActionName(controllerActionName);

    const ControllerClass = this.#controllers[controllerName];
    const action = ControllerClass.prototype[controllerActionName] as Function;

    if (!ControllerClass) {
      throw new Error(`Controller "${controllerName}" is not dfined.`);
    }

    if (!action) {
      throw new Error(
        `Action "${controllerActionName}" is not defined on the "${controllerName}" controller.`
      );
    }

    const middleware = async (
      ctx: RouterContext<State, Custom>
    ): Promise<void> => {
      const controller = new ControllerClass(ctx);
      return action.call(controller);
    };

    return [middleware];
  }
}
