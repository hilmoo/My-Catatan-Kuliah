import { Hocuspocus } from "@hocuspocus/server";
import { Hono } from "hono";

import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { SQLite } from "./store/sqlite.js";

const adapterName = process.env.ADAPTER ?? "sqlite";

function createAdapter() {
  switch (adapterName.toLowerCase()) {
    case "sqlite":
      return new SQLite();
    default:
      console.warn(`Unknown ADAPTER "${adapterName}", falling back to sqlite.`);
      return new SQLite();
  }
}

const hocuspocus = new Hocuspocus({
  extensions: [createAdapter()],
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
      onClose(_evt, ws) {
        clientConnection?.handleClose();
      },
    };
  }),
);

const server = serve(
  {
    fetch: app.fetch,
    port: 3005,
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

console.log("Hono server is running on ws://127.0.0.1:3005");
