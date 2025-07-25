/**
 * kjson feature - BigInt, Instant, and Duration support
 * Provides seamless integration with @atikayda/kjson package
 */

import type { Feature } from "../types.ts";

export const kjsonFeature: Feature = {
  name: "kjson",
  description: "BigInt, Instant, and Duration support for PostgreSQL",
  
  types: {
    kinstant: {
      sql: "kinstant",
      typescript: { type: "Instant", import: "@atikayda/kjson" },
      python: { type: "Instant", import: "kjson" },
      go: { type: "kjson.Instant", import: "github.com/atikayda/kjson" },
      rust: { type: "kjson::Instant" }
    },
    kjson: {
      sql: "kjson",
      typescript: { type: "any" },
      python: { type: "Any", import: "typing" },
      go: { type: "interface{}" },
      rust: { type: "serde_json::Value" }
    },
    kduration: {
      sql: "kduration",
      typescript: { type: "Duration", import: "@atikayda/kjson" },
      python: { type: "Duration", import: "kjson" },
      go: { type: "kjson.Duration", import: "github.com/atikayda/kjson" },
      rust: { type: "kjson::Duration" }
    },
    decimal128: {
      sql: "decimal128",
      typescript: { type: "Decimal128", import: "@atikayda/kjson" },
      python: { type: "Decimal128", import: "kjson" },
      go: { type: "kjson.Decimal128", import: "github.com/atikayda/kjson" },
      rust: { type: "kjson::Decimal128" }
    }
  },

  functions: {
    kjson_now: {
      returns: "kinstant",
      sql: "kjson_now()"
    },
    kjson_duration: {
      returns: "kduration",
      sql: "kjson_duration(interval)",
      args: { interval: "interval" }
    }
  },

  defaultColumns: {
    created_at: {
      type: "kinstant",
      default: "kjson_now()"
    },
    updated_at: {
      type: "kinstant", 
      default: "kjson_now()"
    }
  }
};