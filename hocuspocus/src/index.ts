import { Hocuspocus } from "@hocuspocus/server";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";

import { CONFIG } from "./config.js";
import { PostgresService } from "./services/postgres.js";
import { NatsService } from "./services/nats.js";
import { CourseNotesStore } from "./store.js";


async function bootstrap() {
  const pgService = new PostgresService(CONFIG.postgres.connectionString);
  const natsService = new NatsService(CONFIG.nats.servers);

  try {
    await pgService.ping();

    await natsService.connect();
  } catch (error) {
    console.error("Failed to connect to backing services:", error);
    process.exit(1);
  }

  const storeExtension = new CourseNotesStore(pgService, natsService);
  const hocuspocus = new Hocuspocus({
    extensions: [storeExtension],
  });

  const app = new Hono();
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

  app.get(
    "/",
    upgradeWebSocket((c) => {
      let clientConnection: {
        handleMessage: (arg0: Uint8Array<ArrayBuffer>) => void;
        handleClose: () => void;
      };

      return {
        onOpen(_evt, ws) {
          ws.raw.binaryType = "arraybuffer";
          // @ts-ignore: Raw websocket typing mismatch between Hono and Hocuspocus
          clientConnection = hocuspocus.handleConnection(ws.raw, c.req.raw, {});
        },
        onMessage(evt) {
          if (clientConnection) {
            clientConnection.handleMessage(new Uint8Array(evt.data as ArrayBuffer));
          }
        },
        onClose(_evt, _ws) {
          if (clientConnection) {
            clientConnection.handleClose();
          }
        },
      };
    }),
  );

  const server = serve(
    {
      fetch: app.fetch,
      port: CONFIG.server.port,
    },
    (info) => {
      hocuspocus.hooks("onListen", {
        instance: hocuspocus,
        configuration: hocuspocus.configuration,
        port: info.port,
      });
      console.log(`Server is listening on port ${info.port}`);
    },
  );

  injectWebSocket(server);

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close();
    await natsService.close();
    await pgService.pool.end();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("Fatal error during startup:", err);
  process.exit(1);
});
