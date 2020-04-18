import Koa from 'koa';
import qs from 'koa-qs';

import bodyParser, { Options as BodyParserOptions } from 'koa-bodyparser';
import responseTime from 'koa-response-time';
import helmet from 'koa-helmet';
import cors, { Options as CorsOptions } from '@koa/cors';
import logger from 'koa-logger';
import etag from 'koa-etag';
import conditional from 'koa-conditional-get';

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
  const useEtag = (options && options.etag) !== false;
  const useResponseTime = (options && options.responseTime) !== false;

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

  if (useEtag) {
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
