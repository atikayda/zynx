/**
 * Feature definitions index
 * Exports all available features and registers them
 */

import { featureRegistry } from "../types.ts";
import { kjsonFeature } from "./kjson.ts";
import { uuidOsspFeature } from "./uuid-ossp.ts";
import { postgisFeature } from "./postgis.ts";
import { pgcryptoFeature } from "./pgcrypto.ts";
import { bloomFeature } from "./bloom.ts";

// Register all features
featureRegistry.register(kjsonFeature);
featureRegistry.register(uuidOsspFeature);
featureRegistry.register(postgisFeature);
featureRegistry.register(pgcryptoFeature);
featureRegistry.register(bloomFeature);

// Export for convenience
export {
  kjsonFeature,
  uuidOsspFeature,
  postgisFeature,
  pgcryptoFeature,
  bloomFeature
};