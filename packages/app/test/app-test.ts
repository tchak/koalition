import Koalition, { Koa } from '../src';

QUnit.module('Koalition Application', function (hooks) {
  let app: Koa;

  hooks.beforeEach(async function () {
    app = Koalition();
  });

  QUnit.test('it exists', function (assert) {
    assert.ok(app);
  });
});
