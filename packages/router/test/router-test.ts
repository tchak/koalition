import Koalition, { Koa } from '@koalition/app';

import { Router } from '../src';
import { Middleware, Context } from 'koa';

class MyRouter extends Router {
  resolve(actionName: string): Middleware[] {
    return [
      (ctx: Context): void => {
        ctx.status = 200;
        ctx.body = `hello ${actionName}!`;
      },
    ];
  }
}

QUnit.module('Koalition Router', function (hooks) {
  let app: Koa;
  let router: Router;

  hooks.beforeEach(async function () {
    app = Koalition();
    router = new MyRouter();
    app.use(router.routes());
  });

  QUnit.test('it exists', function (assert) {
    assert.ok(app);
  });
});
