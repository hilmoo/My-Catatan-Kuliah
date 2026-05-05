import { Database } from "@hocuspocus/extension-database";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { renderToMarkdown } from "@tiptap/static-renderer";
import StarterKit from "@tiptap/starter-kit";
import { create, toBinary } from "@bufbuild/protobuf";
import { NewContentSchema, EntityType } from "proto";

import type { PostgresService } from "./services/postgres.js";
import type { NatsService } from "./services/nats.js";
import bs58 from "bs58";

export class ContentStore extends Database {
  constructor(
    private readonly pgService: PostgresService,
    private readonly natsService: NatsService,
    private readonly entityType: 'assignment' | 'note'
  ) {
    super({});

    const tableName = entityType === 'assignment' ? 'assignments' : 'notes';
    const fetchQuery = `SELECT contentb FROM "${tableName}" WHERE id = $1`;
    const updateQuery = `UPDATE "${tableName}" SET contentb = $1, content = $2 WHERE id = $3`;
    const getEntityIdQuery = `SELECT id FROM "${tableName}" WHERE iid = $1`;

    this.configuration = {
      fetch: async ({ documentName }) => {
        try {
          // documentName is expected to be a base58 encoded UUIDv7
          const documentIid = bs58.decode(documentName);
          const entityIdResult = await this.pgService.pool.query<{ id: number }>(getEntityIdQuery, [
            documentIid,
          ]);
          const entityId = entityIdResult?.rows[0]?.id;
          if (!entityId) return null;
          const result = await this.pgService.pool.query<{ contentb: Buffer }>(fetchQuery, [
            entityId,
          ]);
          return result?.rows[0]?.contentb ?? null;
        } catch (error) {
          console.error(`[${entityType}] Error fetching document ${documentName}:`, error);
          return null;
        }
      },
      store: async ({ documentName, state, document }) => {
        try {
          const documentIid = bs58.decode(documentName);
          const entityIdResult = await this.pgService.pool.query<{ id: number }>(getEntityIdQuery, [
            documentIid,
          ]);
          const entityId = entityIdResult?.rows[0]?.id;
          if (!entityId) {
            console.error(`[${entityType}] Entity not found for iid: ${documentName}`);
            return;
          }

          const json = TiptapTransformer.fromYdoc(document, "default");

          const markdown = renderToMarkdown({
            extensions: [StarterKit],
            content: json,
          });

          await this.pgService.pool.query(updateQuery, [state, markdown, entityId]);

          const protoEntityType = entityType === 'assignment' ? EntityType.ASSIGNMENT : EntityType.NOTE;
          const message = create(NewContentSchema, { 
            id: entityId,
            entityType: protoEntityType
          });
          const subject = `embedder.v1.newcontent.${entityType}.${entityId}`;

          if (!this.natsService.js) throw new Error("NATS JetStream client not initialized");
          await this.natsService.js.publish(subject, toBinary(NewContentSchema, message));
        } catch (error) {
          console.error(`[${entityType}] Error storing document ${documentName}:`, error);
        }
      },
    };
  }
}
