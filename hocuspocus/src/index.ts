import { Hono } from "hono";
import { serve, upgradeWebSocket } from "@hono/node-server";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

import { CONFIG } from "./config.js";
import { PostgresService } from "./services/postgres.js";
import { NatsService } from "./services/nats.js";
import { ContentStore } from "./store.js";

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const MSG_AUTH = 2;

interface RawWS {
  send(data: Uint8Array): void;
  close(code?: number, reason?: string): void;
  readyState: number;
}

interface Room {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Map<RawWS, Set<number>>;
  save: () => Promise<void>;
  clearSaveTimer: () => void;
}

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

  const assignmentStore = new ContentStore(pgService, natsService, "assignment");
  const noteStore = new ContentStore(pgService, natsService, "note");

  const rooms = new Map<string, Room>();

  async function getRoom(roomId: string, store: ContentStore): Promise<Room> {
    const roomKey = `${store === assignmentStore ? "assignment" : "note"}:${roomId}`;
    let room = rooms.get(roomKey);
    if (room) return room;

    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    const clients: Room["clients"] = new Map();

    const persistedState = await store.fetch(roomId);
    if (persistedState) {
      Y.applyUpdate(doc, persistedState);
    }

    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const clearSaveTimer = () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
    };

    const save = async () => {
      clearSaveTimer();
      const state = Y.encodeStateAsUpdate(doc);
      await store.store(roomId, state, doc);
    };

    const debouncedSave = () => {
      clearSaveTimer();
      saveTimer = setTimeout(save, 1000);
    };

    room = { doc, awareness, clients, save, clearSaveTimer };

    doc.on("update", (update: Uint8Array, origin: unknown) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      for (const ws of Array.from(room!.clients.keys())) {
        if (ws !== origin && ws.readyState === 1) {
          ws.send(message);
        }
      }

      debouncedSave();
    });

    awareness.on(
      "update",
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => {
        const clientIds = room!.clients.get(origin as RawWS);
        if (clientIds) {
          for (const id of added) clientIds.add(id);
          for (const id of removed) clientIds.delete(id);
        }

        const changedClients = [...added, ...updated, ...removed];
        if (changedClients.length === 0) return;

        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MSG_AWARENESS);
        encoding.writeVarUint8Array(
          encoder,
          awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
        );
        const message = encoding.toUint8Array(encoder);

        for (const ws of Array.from(room!.clients.keys())) {
          if (ws !== origin && ws.readyState === 1) {
            ws.send(message);
          }
        }
      },
    );

    rooms.set(roomKey, room);
    return room;
  }

  const app = new Hono();
  const wss = new WebSocketServer({ noServer: true });

  const handleWebSocket = (store: ContentStore) =>
    upgradeWebSocket(async (c) => {
      const roomId = c.req.query("id") || c.req.param("id");
      if (!roomId) {
        return {
          onOpen(_evt, ws) {
            ws.close(1008, "Missing document ID");
          },
        };
      }

      const room = await getRoom(roomId, store);

      return {
        onOpen(_evt, ws) {
          const raw = ws.raw as unknown as RawWS;
          if (!raw) return;

          room.clients.set(raw, new Set());

          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MSG_SYNC);
          syncProtocol.writeSyncStep1(encoder, room.doc);
          raw.send(encoding.toUint8Array(encoder));
        },
        onMessage(evt, ws) {
          const raw = ws.raw as unknown as RawWS;
          if (!raw || typeof evt.data === "string") return;

          const data = new Uint8Array(evt.data as ArrayBuffer);
          const decoder = decoding.createDecoder(data);
          const msgType = decoding.readVarUint(decoder);

          switch (msgType) {
            case MSG_SYNC: {
              const encoder = encoding.createEncoder();
              encoding.writeVarUint(encoder, MSG_SYNC);
              syncProtocol.readSyncMessage(decoder, encoder, room.doc, raw);

              if (encoding.length(encoder) > 1) {
                raw.send(encoding.toUint8Array(encoder));
              }
              break;
            }
            case MSG_AWARENESS: {
              const update = decoding.readVarUint8Array(decoder);
              awarenessProtocol.applyAwarenessUpdate(room.awareness, update, raw);
              break;
            }
            case MSG_AUTH: {
              // const token = decoding.readVarString(decoder);
              break;
            }
          }
        },
        onClose(_evt, ws) {
          const raw = ws.raw as unknown as RawWS;
          if (!raw) return;

          const clientIds = room.clients.get(raw);
          room.clients.delete(raw);

          if (clientIds && clientIds.size > 0) {
            awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(clientIds), null);
          }
          if (room.clients.size === 0) {
            room.save().then(() => {
              room.doc.destroy();
              room.awareness.destroy();
              const roomKey = `${store === assignmentStore ? "assignment" : "note"}:${roomId}`;
              rooms.delete(roomKey);
            });
          }
        },
      };
    });

  app.get("/assignments/:id", handleWebSocket(assignmentStore));
  app.get("/notes/:id", handleWebSocket(noteStore));

  const server = serve(
    {
      fetch: app.fetch,
      port: CONFIG.server.port,
      websocket: { server: wss },
    },
    (info) => {
      console.log(`Server is listening on port ${info.port}`);
    },
  );

  const shutdown = async () => {
    console.log("Shutting down...");

    // Save all rooms
    const savePromises = Array.from(rooms.values()).map((room) => room.save());
    await Promise.all(savePromises);

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
