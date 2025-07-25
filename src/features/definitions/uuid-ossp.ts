/**
 * uuid-ossp feature - UUID generation support
 * Provides UUID v4 generation and proper type mappings
 */

import type { Feature } from "../types.ts";

export const uuidOsspFeature: Feature = {
  name: "uuid-ossp",
  description: "UUID generation support using uuid-ossp extension",
  
  extensions: ["uuid-ossp"],
  
  types: {
    uuid: {
      sql: "uuid",
      typescript: { type: "string" },
      python: { type: "UUID", import: "uuid" },
      go: { type: "uuid.UUID", import: "github.com/google/uuid" },
      rust: { type: "Uuid", import: "uuid" }
    }
  },

  functions: {
    uuid_generate_v4: {
      returns: "uuid",
      sql: "uuid_generate_v4()"
    },
    uuid_generate_v1: {
      returns: "uuid",
      sql: "uuid_generate_v1()"
    },
    uuid_generate_v1mc: {
      returns: "uuid",
      sql: "uuid_generate_v1mc()"
    },
    uuid_generate_v3: {
      returns: "uuid",
      sql: "uuid_generate_v3(namespace, name)",
      args: { 
        namespace: "uuid",
        name: "text"
      }
    },
    uuid_generate_v5: {
      returns: "uuid",
      sql: "uuid_generate_v5(namespace, name)",
      args: {
        namespace: "uuid",
        name: "text"
      }
    },
    uuid_nil: {
      returns: "uuid",
      sql: "uuid_nil()"
    }
  },

  defaultColumns: {
    id: {
      type: "uuid",
      default: "uuid_generate_v4()"
    }
  }
};