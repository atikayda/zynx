/**
 * bloom feature - Bloom filter index support
 * Provides space-efficient probabilistic data structure for testing set membership
 */

import type { Feature } from "../types.ts";

export const bloomFeature: Feature = {
  name: "bloom",
  description: "Bloom filter index support for PostgreSQL",
  
  extensions: ["bloom"],
  
  indexes: {
    bloom: {
      type: "bloom",
      parameters: {
        length: {
          type: "integer",
          default: 80,
          range: [1, 256]
        },
        col1: {
          type: "integer", 
          default: 2,
          range: [1, 2000]
        },
        col2: {
          type: "integer",
          default: 2,
          range: [1, 2000]
        },
        col3: {
          type: "integer",
          default: 2,
          range: [1, 2000]
        },
        col4: {
          type: "integer",
          default: 2,
          range: [1, 2000]
        },
        col5: {
          type: "integer",
          default: 2,
          range: [1, 2000]
        },
        // Bloom supports up to 32 columns
        // Adding just a few more for demonstration
        col6: {
          type: "integer",
          default: 2,
          range: [1, 2000]
        }
      },
      sql: `CREATE INDEX {name} ON {table} USING bloom ({columns}) 
            WITH (length = {length}, col1 = {col1}, col2 = {col2}, col3 = {col3})`
    }
  }
};