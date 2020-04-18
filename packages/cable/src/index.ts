import { Server, IncomingMessage } from 'http';
import { Server as WebSocketServer } from 'ws';
import { PubSub, PubSubEngine } from 'graphql-subscriptions';

import { CableConnection, ChannelResolver } from './connection';
export * from './connection';

interface VerifyClientContext {
  req: IncomingMessage;
}

export interface CableOptions {
  resolve: ChannelResolver;
  path?: string;
  pubsub?: PubSubEngine;
}

export function cable(server: Server, options: CableOptions): void {
  const path = options.path || '/channels';
  const pubsub = options.pubsub || new PubSub();

  const wss = new WebSocketServer({
    server,
    verifyClient: ({ req }: VerifyClientContext, next): void => {
      const url = req.url;
      if (url && url.endsWith(path)) {
        next(true);
      } else {
        next(false);
      }
    },
  });

  wss.on('connection', (socket) => {
    const connection = new CableConnection(socket, pubsub, options.resolve);
    connection.connect();
  });

  server.on('close', () => {
    for (const socket of wss.clients) {
      CableConnection.close(socket);
    }
    wss.close();
  });
}
