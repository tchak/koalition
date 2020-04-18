import Koa from 'koa';
import qs from 'koa-qs';

import bodyParser, { Options as BodyParserOptions } from 'koa-bodyparser';
import responseTime from 'koa-response-time';
import helmet from 'koa-helmet';
import cors, { Options as CorsOptions } from '@koa/cors';
import logger from 'koa-logger';

export interface ErrorResponse {
  status: number;
  type: string;
  body: unknown;
}

export interface KoalitionOptions {
  logger?: boolean;
  helmet?: boolean;
  cors?: boolean | CorsOptions;
  bodyParser?: BodyParserOptions;
  errorHandler?: (err: Error) => ErrorResponse;
}

const DEFAULT_BODY_PARSER_OPTIONS: BodyParserOptions = {
  enableTypes: ['json'],
};

export { Koa };

export default function Koalition(options?: KoalitionOptions): Koa {
  const app = new Koa();
  qs(app);

  if (options && options.errorHandler) {
    const errorHandler = options.errorHandler;

    app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        Object.assign(ctx, errorHandler(err));
      }
    });
  }

  const useLogger = (options && options.logger) !== false;
  const useHelmet = (options && options.helmet) !== false;
  const useCors = (options && options.cors) !== false;

  if (useLogger) {
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

  const bodyParserOptions =
    (options && options.bodyParser) || DEFAULT_BODY_PARSER_OPTIONS;
  app.use(bodyParser(bodyParserOptions));

  app.use(responseTime({ hrtime: true }));

  return app;
}
