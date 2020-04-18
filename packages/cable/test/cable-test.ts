import Koalition, { Koa } from '@koalition/app';
import { Server } from 'http';

import { cable, Channel } from '../src';

class MyChannel extends Channel {}

QUnit.module('Koalition cable', function (hooks) {
  let app: Koa;
  let server: Server;

  hooks.beforeEach(async function () {
    app = Koalition();
    server = app.listen();
    cable(server, {
      resolve: (_, params): Channel => new MyChannel(params),
    });
  });

  hooks.afterEach(function (assert) {
    const done = assert.async();
    server.close(done);
  });

  QUnit.test('it exists', function (assert) {
    assert.ok(app);
  });
});
