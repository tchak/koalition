import Koalition, { Koa } from '@koalition/app';
import request from 'supertest';

import { Router, Middleware } from '../src';

class MyRouter extends Router {
  resolve(actionName: string): Middleware[] {
    return [
      (ctx): void => {
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
    router.map('hello => action');
    router.map('/hello2 => action2');
    router.get('/yolo', (ctx) => {
      ctx.status = 200;
      ctx.body = 'yolo';
    });
    app.use(router.routes());
  });

  QUnit.test('it exists', async function (assert) {
    assert.ok(app);

    let response = await request(app.callback()).get('/yolo');
    assert.equal(response.text, 'yolo');

    response = await request(app.callback()).get('/hello');
    assert.equal(response.text, 'hello action!');

    response = await request(app.callback()).get('/hello2');
    assert.equal(response.text, 'hello action2!');
  });
});
