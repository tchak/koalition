import { Server } from 'http';
import { ListenOptions } from 'net';
import Koa, { DefaultState, DefaultContext } from 'koa';

export class KoalitionServer<State = DefaultState, Custom = DefaultContext> {
  #starting?: Promise<void>;
  #closing?: Promise<void>;
  #app: Koa<State, Custom>;
  #server?: Server;

  get app(): Koa<State, Custom> {
    return this.#app;
  }

  get server(): Server | undefined {
    return this.#server;
  }

  constructor(app: Koa<State, Custom>) {
    this.#app = app;
  }

  start(port?: number, hostname?: string, backlog?: number): Promise<void>;
  start(
    port: number,
    hostname?: string,
    listeningListener?: () => void
  ): Promise<void>;
  start(
    port: number,
    backlog?: number,
    listeningListener?: () => void
  ): Promise<void>;
  start(port: number): Promise<void>;
  start(
    path: string,
    backlog?: number,
    listeningListener?: () => void
  ): Promise<void>;
  start(path: string): Promise<void>;
  start(options: ListenOptions): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  start(handle: any, backlog?: number): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  start(handle: any): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  start(...args: any): Promise<void> {
    if (this.#server) {
      throw new Error('Server already started');
    }

    if (!this.#starting) {
      this.#starting = new Promise((resolve) => {
        args.push((): void => {
          this.#starting = undefined;
          resolve();
        });
        const server = this.#app.listen(...args);
        server
          .once('listening', () => {
            this.#app.emit('start', server);
          })
          .once('close', () => {
            this.#app.emit('close', server);
          });
        this.#server = server;
      });
    }

    return this.#starting;
  }

  close(): Promise<void> {
    if (!this.#server) {
      throw new Error('Server not started');
    }

    if (!this.#closing) {
      const server = this.#server;
      this.#closing = new Promise((resolve) => {
        server.close(() => {
          this.#closing = undefined;
          this.#server = undefined;
          resolve();
        });
      });
    }

    return this.#closing;
  }
}
