import Koalition, { Koa } from '@koalition/app';

import { ControllerRouter } from '../src';

QUnit.module('Koalition Controller', function (hooks) {
  let app: Koa;
  let router: ControllerRouter;

  hooks.beforeEach(async function () {
    app = Koalition();
    router = new ControllerRouter();
    app.use(router.routes());
  });

  QUnit.test('it exists', function (assert) {
    assert.ok(app);
  });
});
