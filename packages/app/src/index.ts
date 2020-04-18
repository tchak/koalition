import Koa, {
  Middleware,
  Context,
  ParameterizedContext,
  Next,
  DefaultState,
  DefaultContext,
} from 'koa';
import qs from 'koa-qs';

import bodyParser, { Options as BodyParserOptions } from 'koa-bodyparser';
import responseTime from 'koa-response-time';
import helmet from 'koa-helmet';
import cors, { Options as CorsOptions } from '@koa/cors';
import logger from 'koa-logger';
import etag from 'koa-etag';
import conditional from 'koa-conditional-get';

export {
  Koa,
  Middleware,
  Context,
  ParameterizedContext,
  Next,
  DefaultState,
  DefaultContext,
};

export * from './server';

export interface ErrorResponse {
  status: number;
  type: string;
  body: unknown;
}

export interface KoalitionOptions {
  responseTime?: boolean;
  logger?: boolean;
  helmet?: boolean;
  cors?: boolean | CorsOptions;
  etag?: boolean;
  bodyParser?: BodyParserOptions;
  errorHandler?: (err: Error) => ErrorResponse;
}

export { CorsOptions, BodyParserOptions };

const DEFAULT_BODY_PARSER_OPTIONS: BodyParserOptions = {
  enableTypes: ['json'],
};

const environement = process.env.NODE_ENV || 'development';
const isTest = environement === 'test';
const isDevelopment = environement === 'development';

function useLogger(option?: boolean): boolean {
  if (option === true) {
    return true;
  } else if (option === false) {
    return false;
  }
  return !isTest;
}

function useEtag(option?: boolean): boolean {
  if (option === true) {
    return true;
  } else if (option === false) {
    return false;
  }
  return !isDevelopment;
}

export default function Koalition<
  State = DefaultState,
  Custom = DefaultContext
>(options?: KoalitionOptions): Koa<State, Custom> {
  const app = new Koa<State, Custom>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qs(app as any);

  if (options && options.errorHandler) {
    const errorHandler = options.errorHandler;

    app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        Object.assign(ctx, errorHandler(err));

        ctx.app.emit('error', err, ctx);
      }
    });
  }

  const useHelmet = (options && options.helmet) !== false;
  const useCors = (options && options.cors) !== false;
  const useResponseTime = (options && options.responseTime) !== false;

  if (useLogger(options && options.logger)) {
    app.use(logger());
  }
  if (useHelmet) {
    app.use(helmet());
  }

  if (useCors) {
    if (options && typeof options.cors === 'object') {
      app.use(cors(options.cors));
    } else {
      app.use(cors());
    }
  }

  if (useEtag(options && options.etag)) {
    app.use(conditional());
    app.use(etag());
  }

  const bodyParserOptions =
    (options && options.bodyParser) || DEFAULT_BODY_PARSER_OPTIONS;
  app.use(bodyParser(bodyParserOptions));

  if (useResponseTime) {
    app.use(responseTime({ hrtime: true }));
  }

  return app;
}
