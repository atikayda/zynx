/**
 * pgcrypto feature - Cryptographic functions support
 * Provides encryption, hashing, and random generation functions
 */

import type { Feature } from "../types.ts";

export const pgcryptoFeature: Feature = {
  name: "pgcrypto",
  description: "Cryptographic functions for PostgreSQL",
  
  extensions: ["pgcrypto"],
  
  functions: {
    gen_random_uuid: {
      returns: "uuid",
      sql: "gen_random_uuid()"
    },
    gen_random_bytes: {
      returns: "bytea",
      sql: "gen_random_bytes(count)",
      args: { count: "integer" }
    },
    digest: {
      returns: "bytea",
      sql: "digest(data, type)",
      args: { 
        data: "text",
        type: "text" // 'md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'
      }
    },
    hmac: {
      returns: "bytea",
      sql: "hmac(data, key, type)",
      args: {
        data: "text",
        key: "text",
        type: "text"
      }
    },
    crypt: {
      returns: "text",
      sql: "crypt(password, salt)",
      args: {
        password: "text",
        salt: "text"
      }
    },
    gen_salt: {
      returns: "text",
      sql: "gen_salt(type, iter_count)",
      args: {
        type: "text", // 'bf', 'md5', 'xdes', 'des'
        iter_count: "integer"
      }
    },
    pgp_sym_encrypt: {
      returns: "bytea",
      sql: "pgp_sym_encrypt(data, psw)",
      args: {
        data: "text",
        psw: "text"
      }
    },
    pgp_sym_decrypt: {
      returns: "text",
      sql: "pgp_sym_decrypt(msg, psw)",
      args: {
        msg: "bytea",
        psw: "text"
      }
    }
  },

  defaultColumns: {
    id: {
      type: "uuid",
      default: "gen_random_uuid()"
    }
  }
};