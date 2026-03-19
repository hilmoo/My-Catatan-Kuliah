import { defineConfig } from "orval";

export default defineConfig({
  ai: {
    input: {
      target: "../openapi.yaml",
    },
    output: {
      mode: "tags-split",
      target: "src/api/",
      schemas: "src/api/model",
      client: "react-query",
      mock: false,
    },
  },
  aiZod: {
    input: {
      target: "../openapi.yaml",
    },
    output: {
      mode: "tags-split",
      client: "zod",
      target: "src/api/",
      fileExtension: ".zod.ts",
    },
  },
});
