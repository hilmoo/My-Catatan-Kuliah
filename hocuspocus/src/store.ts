import { createYooptaEditor, type SlateElement, YooptaPlugin } from "@yoopta/editor";
import { markdown } from "@yoopta/exports";
import * as Y from "yjs";
import { create, toBinary } from "@bufbuild/protobuf";
import { NewContentSchema, EntityType } from "proto";
import bs58 from "bs58";

import { YDocAsYooptaValue } from "./yoopta/toYoopta.js";
import { YOOPTA_PLUGINS } from "./yoopta/plugins.js";
import { YOOPTA_MARKS } from "./yoopta/marks.js";
import type { PostgresService } from "./services/postgres.js";
import type { NatsService } from "./services/nats.js";

const exportEditor = createYooptaEditor({
  plugins: YOOPTA_PLUGINS as unknown as YooptaPlugin<
    Record<string, SlateElement>,
    unknown
  >[],
  marks: YOOPTA_MARKS,
});

export class ContentStore {
  constructor(
    private readonly pgService: PostgresService,
    private readonly natsService: NatsService,
    private readonly entityType: "assignment" | "note"
  ) {}

  private getQueries() {
    const tableName = this.entityType === "assignment" ? "assignments" : "notes";
    return {
      fetchQuery: `SELECT contentb FROM "${tableName}" WHERE id = $1`,
      updateQuery: `UPDATE "${tableName}" SET contentb = $1, content = $2 WHERE id = $3`,
      getEntityIdQuery: `SELECT id FROM "${tableName}" WHERE iid = $1`,
    };
  }

  async fetch(documentName: string): Promise<Uint8Array | null> {
    const { fetchQuery, getEntityIdQuery } = this.getQueries();
    try {
      // documentName is expected to be a base58 encoded UUIDv7
      const documentIid = bs58.decode(documentName);
      console.log(`[${this.entityType}] Fetching document with iid: ${documentName}`);
      const entityIdResult = await this.pgService.pool.query<{ id: number }>(
        getEntityIdQuery,
        [documentIid]
      );
      const entityId = entityIdResult?.rows[0]?.id;
      if (!entityId) return null;
      const result = await this.pgService.pool.query<{ contentb: Buffer }>(
        fetchQuery,
        [entityId]
      );
      return result?.rows[0]?.contentb ?? null;
    } catch (error) {
      console.error(
        `[${this.entityType}] Error fetching document ${documentName}:`,
        error
      );
      return null;
    }
  }

  async store(documentName: string, state: Uint8Array, document: Y.Doc): Promise<void> {
    const { updateQuery, getEntityIdQuery } = this.getQueries();
    try {
      const documentIid = bs58.decode(documentName);
      const entityIdResult = await this.pgService.pool.query<{ id: number }>(
        getEntityIdQuery,
        [documentIid]
      );
      const entityId = entityIdResult?.rows[0]?.id;
      if (!entityId) {
        console.error(
          `[${this.entityType}] Entity not found for iid: ${documentName}`
        );
        return;
      }

      const yooptaValue = YDocAsYooptaValue(document);
      const md = markdown.serialize(exportEditor, yooptaValue);

      await this.pgService.pool.query(updateQuery, [
        Buffer.from(state),
        md,
        entityId,
      ]);

      const protoEntityType =
        this.entityType === "assignment"
          ? EntityType.ASSIGNMENT
          : EntityType.NOTE;
      const message = create(NewContentSchema, {
        id: entityId,
        entityType: protoEntityType,
      });
      const subject = `embedder.v1.newcontent.${this.entityType}.${entityId}`;

      if (!this.natsService.js)
        throw new Error("NATS JetStream client not initialized");
      await this.natsService.js.publish(
        subject,
        toBinary(NewContentSchema, message)
      );
    } catch (error) {
      console.error(
        `[${this.entityType}] Error storing document ${documentName}:`,
        error
      );
    }
  }
}
