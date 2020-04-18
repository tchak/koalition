import Koalition, { Koa } from '@koalition/app';

import { errorHandler } from '../src';

QUnit.module('Koalition error handler', function (hooks) {
  let app: Koa;

  hooks.beforeEach(async function () {
    app = Koalition({ errorHandler });
  });

  QUnit.test('it exists', function (assert) {
    assert.ok(app);
  });
});
