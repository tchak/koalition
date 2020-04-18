import { Server } from 'http';
import Koa, { DefaultState, DefaultContext } from 'koa';

export class KoalitionServer<State = DefaultState, Custom = DefaultContext> {
  #app: Koa<State, Custom>;
  #server?: Server;
  #starting = false;

  constructor(app: Koa<State, Custom>) {
    this.#app = app;
  }

  start(port: string | number): Promise<void> {
    if (this.#server || this.#starting) {
      return Promise.resolve();
    }

    this.#starting = true;
    return new Promise((resolve) => {
      const server = this.#app.listen(port, () => resolve());
      server.once('close', () => {
        this.#app.emit('close', server);
      });
      server.once('listening', () => {
        this.#app.emit('start', server);
      });
      this.#starting = false;
      this.#server = server;
    });
  }

  stop(): Promise<void> {
    if (!this.#server) {
      return Promise.resolve();
    }

    const server = this.#server;
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  }
}
