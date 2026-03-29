import { Database } from "@hocuspocus/extension-database";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { renderToHTMLString } from "@tiptap/static-renderer";
import StarterKit from "@tiptap/starter-kit";
import { create, toBinary } from "@bufbuild/protobuf";
import { NewContentSchema } from "proto";

import type { PostgresService } from "./services/postgres.js";
import type { NatsService } from "./services/nats.js";
import bs58 from "bs58";

const fetchQuery = `SELECT content_blob FROM "pages_content" WHERE page_id = $1`;
const updateQuery = `UPDATE "pages_content" SET content_blob = $1, content_html = $2 WHERE page_id = $3`;
const getPageIdQuery = `SELECT id FROM "pages" WHERE iid = $1`;

export class CourseNotesStore extends Database {
  constructor(
    private readonly pgService: PostgresService,
    private readonly natsService: NatsService,
  ) {
    super({});

    this.configuration = {
      fetch: async ({ documentName }) => {
        const documentIid = bs58.decode(documentName);
        const pageIdResult = await this.pgService.pool.query<{ id: number }>(getPageIdQuery, [
          documentIid,
        ]);
        const pageId = pageIdResult?.rows[0]?.id;
        const result = await this.pgService.pool.query<{ content_blob: Buffer }>(fetchQuery, [
          pageId,
        ]);
        return result?.rows[0]?.content_blob ?? null;
      },
      store: async ({ documentName, state, document }) => {
        const documentIid = bs58.decode(documentName);
        const pageIdResult = await this.pgService.pool.query<{ id: number }>(getPageIdQuery, [
          documentIid,
        ]);
        const pageId = pageIdResult?.rows[0]?.id;

        const json = TiptapTransformer.fromYdoc(document, "default");

        const html = renderToHTMLString({
          extensions: [StarterKit],
          content: json,
        });

        await this.pgService.pool.query(updateQuery, [state, html, pageId]);

        const message = create(NewContentSchema, { id: pageId });
        const subject = `embedder.v1.newcontent.${pageId}`;

        if (!this.natsService.js) throw new Error("NATS JetStream client not initialized");
        await this.natsService.js.publish(subject, toBinary(NewContentSchema, message));
      },
    };
  }
}
