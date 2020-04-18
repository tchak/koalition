import WebSocket from 'ws';
import { PubSubEngine } from 'graphql-subscriptions';

const PING_INTERVAL = 3 * 1000;

export enum MessageType {
  WELCOME = 'welcome',
  PING = 'ping',
  CONFIRM_SUBSCRIPTION = 'confirm_subscription',
  PUBLISH = 'publish',
  REJECT_SUBSCRIPTION = 'reject_subscription',
  DISCONNECT = 'disconnect',
}

export enum CommandType {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  MESSAGE = 'message',
}

export enum DisconnectReason {
  INVALID_REQUEST = 'invalid_request',
  UNAUTHORIZED = 'unauthorized',
  SERVER_RESTART = 'server_restart',
}

export interface MessagePayload {
  command: CommandType;
  identifier: string;
  data: string;
}

export interface SendPayload extends Record<string, unknown> {
  type: MessageType;
  identifier?: string;
}

export interface CommandPayload extends Record<string, unknown> {
  action: 'recieve' | string;
}

export interface SubscribePayload extends Record<string, unknown> {
  channel: string;
}

export interface Subscription<Params = unknown> {
  channelName: string;
  params: Params;
  subIds: number[];
}

export interface ChannelParams<Params = unknown> {
  identifier: string;
  params: Params;
}

abstract class AbstractChannel<Params = unknown, Data = unknown> {
  #identifier: string;
  #params: Params;
  #streams: false | string[] = [];

  get identifier(): string {
    return this.#identifier;
  }

  get params(): Params {
    return this.#params;
  }

  get streams(): string[] | false {
    return this.#streams;
  }

  constructor(params: ChannelParams<Params>) {
    this.#identifier = params.identifier;
    this.#params = params.params;
  }

  streamTo(streams: string | string[]): void {
    if (Array.isArray(streams)) {
      this.#streams = streams;
    } else {
      this.#streams = [streams];
    }
  }

  abstract subscribed(identifier: string): void;
  abstract unsubscribed(identifier: string): void;
  abstract recieve(data: Data): void;
}

export abstract class Channel<
  Params = unknown,
  Data = unknown
> extends AbstractChannel<Params, Data> {
  subscribed(): void {
    return;
  }

  unsubscribed(): void {
    return;
  }

  recieve(): void {
    return;
  }
}

export type ChannelResolver = (
  channelName: string,
  params: ChannelParams
) => AbstractChannel;

const connections = new WeakMap<WebSocket, CableConnection>();

export class CableConnection {
  #pubsub: PubSubEngine;
  #socket: WebSocket;
  #subscriptions = new Map<string, Subscription>();
  #resolve: ChannelResolver;
  #interval?: number;

  constructor(
    socket: WebSocket,
    pubsub: PubSubEngine,
    resolve: ChannelResolver
  ) {
    this.#socket = socket;
    this.#pubsub = pubsub;
    this.#resolve = resolve;
  }

  static close(socket: WebSocket): void {
    const connection = connections.get(socket);
    if (connection) {
      connection.close();
      connection.disconnect(DisconnectReason.SERVER_RESTART);
    }
  }

  connect(): void {
    connections.set(this.#socket, this);

    this.#socket.on('message', (data: string) => this.onMessage(data));
    this.#socket.on('close', () => this.close());

    this.welcome();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.#interval = setInterval(() => this.ping(), PING_INTERVAL) as any;
  }

  private resolve(channelName: string, params: ChannelParams): AbstractChannel {
    return this.#resolve(channelName, params);
  }

  private send(data: SendPayload): void {
    if (this.#socket.readyState === WebSocket.OPEN) {
      this.#socket.send(JSON.stringify(data));
    } else {
      this.#socket.terminate();
    }
  }

  private onMessage(message: string): void {
    const { command, data, identifier } = JSON.parse(message) as MessagePayload;

    switch (command) {
      case CommandType.SUBSCRIBE:
        this.subscribe(identifier, JSON.parse(identifier));
        break;
      case CommandType.UNSUBSCRIBE:
        this.unsubscribe(identifier);
        break;
      case CommandType.MESSAGE:
        this.message(identifier, JSON.parse(data));
        break;
      default:
        this.disconnect(DisconnectReason.INVALID_REQUEST);
    }
  }

  private async subscribe(
    identifier: string,
    { channel: channelName, ...params }: SubscribePayload
  ): Promise<void> {
    if (this.#subscriptions.has(identifier)) {
      this.unsubscribe(identifier, false);
    }

    const channel = this.resolve(channelName, { identifier, params });
    channel.subscribed(identifier);

    if (channel.streams === false) {
      this.rejectSubscription(identifier);
    } else {
      const subIds: number[] = [];

      for (const streamName of channel.streams) {
        const subId = await this.#pubsub.subscribe(
          `streams/${streamName}`,
          (message: unknown) =>
            this.send({ type: MessageType.PUBLISH, identifier, message }),
          {}
        );
        subIds.push(subId);
      }

      this.#subscriptions.set(identifier, {
        channelName,
        params,
        subIds,
      });

      this.confirmSubscription(identifier);
    }
  }

  private unsubscribe(identifier: string, notify = true): void {
    const subscription = this.#subscriptions.get(identifier);

    if (subscription) {
      for (const subId of subscription.subIds) {
        this.#pubsub.unsubscribe(subId);
      }

      if (notify) {
        const { channelName, params } = subscription;
        const channel = this.resolve(channelName, { identifier, params });
        channel.unsubscribed(identifier);
      }

      this.#subscriptions.delete(identifier);
    }
  }

  private message(
    identifier: string,
    { action = 'receive', ...data }: CommandPayload
  ): void {
    const subscription = this.#subscriptions.get(identifier);

    if (subscription) {
      const { channelName, params } = subscription;
      const channel = this.resolve(channelName, { identifier, params });

      if (action === 'receive') {
        channel.recieve(data);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (channel as any)[action](data);
      }
    }
  }

  private close(): void {
    const subIds: number[] = [...this.#subscriptions.values()].flatMap(
      ({ subIds }) => subIds
    );
    for (const subId of subIds) {
      this.#pubsub.unsubscribe(subId);
    }

    this.#subscriptions.clear();

    clearInterval(this.#interval);
  }

  private disconnect(reason: DisconnectReason, reconnect = false): void {
    this.send({ type: MessageType.DISCONNECT, reason, reconnect });
  }

  private welcome(): void {
    this.send({ type: MessageType.WELCOME });
  }

  private ping(): void {
    this.send({ type: MessageType.PING, message: Date.now() });
  }

  private rejectSubscription(identifier: string): void {
    this.send({
      type: MessageType.REJECT_SUBSCRIPTION,
      identifier,
    });
  }

  private confirmSubscription(identifier: string): void {
    this.send({
      type: MessageType.CONFIRM_SUBSCRIPTION,
      identifier,
    });
  }
}
