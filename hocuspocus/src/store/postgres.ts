import type { DatabaseConfiguration } from "@hocuspocus/extension-database";
import { Database } from "@hocuspocus/extension-database";
import { Pool, type PoolConfig } from "pg";
import { TiptapTransformer } from "@hocuspocus/transformer";
import { renderToHTMLString } from "@tiptap/static-renderer";
import StarterKit from "@tiptap/starter-kit";

export const fetchQuery = `
  SELECT content_blob FROM "course_notes" WHERE id = $1
`;

export const updateQuery = `
  UPDATE "course_notes" SET content_blob = $1, content = $2 WHERE id = $3
`;

export interface PostgresConfiguration extends DatabaseConfiguration {
  /**
   * pg Pool configuration options.
   * https://node-postgres.com/apis/pool
   */
  poolConfig: PoolConfig;
}

export class Postgres extends Database {
  pool?: Pool;

  configuration: PostgresConfiguration = {
    poolConfig: {},
    fetch: async ({ documentName }) => {
      const result = await this.pool?.query<{ content_blob: Buffer }>(
        fetchQuery,
        [documentName],
      );
      return result?.rows[0]?.content_blob ?? null;
    },
    store: async ({ documentName, state, document }) => {
      const json = TiptapTransformer.fromYdoc(document, "default");

      const html = renderToHTMLString({
        extensions: [
          StarterKit,
        ],
        content: json,
      });

      await this.pool?.query(updateQuery, [state, html, documentName]);
    },
  };

  constructor(configuration?: Partial<PostgresConfiguration>) {
    super({});

    this.configuration = {
      ...this.configuration,
      ...configuration,
    };
  }

  async onConfigure() {
    this.pool = new Pool(this.configuration.poolConfig);
  }
}
