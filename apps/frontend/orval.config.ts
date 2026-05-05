import { defineConfig } from "orval";

export default defineConfig({
  ai: {
    input: {
      target: "../openapi/openapi.json",
    },
    output: {
      baseUrl: "/",
      mode: "tags-split",
      target: "src/api/",
      schemas: "src/api/model",
      client: "react-query",
      mock: false,
    },
  },
  aiZod: {
    input: {
      target: "../openapi/openapi.json",
    },
    output: {
      mode: "tags-split",
      client: "zod",
      target: "src/api/",
      fileExtension: ".zod.ts",
    },
  },
});
