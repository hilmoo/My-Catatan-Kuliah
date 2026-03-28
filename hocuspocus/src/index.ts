import { Hocuspocus } from "@hocuspocus/server";
import { Hono } from "hono";

import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Postgres } from "./store.js";

import { NewContentSchema } from "proto";
console.log(NewContentSchema);

const hocuspocus = new Hocuspocus({
  extensions: [
    new Postgres({
      poolConfig: {
        connectionString: process.env.DATABASE_URL,
      },
    }),
  ],
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
        // @ts-ignore
        clientConnection = hocuspocus.handleConnection(ws.raw, c.req.raw, {});
      },
      onMessage(evt) {
        // @ts-ignore
        clientConnection?.handleMessage(new Uint8Array(evt.data));
      },
      onClose(_evt, _ws) {
        clientConnection?.handleClose();
      },
    };
  }),
);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3005;
const server = serve(
  {
    fetch: app.fetch,
    port: port,
  },
  (info) => {
    hocuspocus.hooks("onListen", {
      instance: hocuspocus,
      configuration: hocuspocus.configuration,
      port: info.port,
    });
  },
);

injectWebSocket(server);

console.log("Hocuspocus is running on port " + port);
