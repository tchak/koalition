import Koalition, { Koa } from '@koalition/app';
import request from 'supertest';

import { ControllerRouter, BaseController } from '../src';

class BooksController extends BaseController {
  show(): void {
    this.text('hello world!');
  }
}

QUnit.module('Koalition Controller', function (hooks) {
  let app: Koa;
  let router: ControllerRouter;

  hooks.beforeEach(async function () {
    app = Koalition({ logger: false });
    router = new ControllerRouter({ controllers: [BooksController] });
    router.resources('books', { only: ['show'] });
    app.use(router.routes());
  });

  QUnit.test('it exists', async function (assert) {
    assert.ok(app);

    const response = await request(app.callback()).get('/books/1');
    assert.equal(response.text, 'hello world!');
  });
});
