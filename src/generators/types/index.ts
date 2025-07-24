/**
 * 🦎 Zynx Type Generators - Export all type generators
 */

export { TypeGenerator, type TypeGeneratorConfig } from "./base.ts";
export { TypeScriptGenerator } from "./typescript.ts";
export { GoGenerator } from "./golang.ts";
export { PythonGenerator } from "./python.ts";
export { RustGenerator } from "./rust.ts";

import { TypeGenerator } from "./base.ts";
import { TypeScriptGenerator } from "./typescript.ts";
import { GoGenerator } from "./golang.ts";
import { PythonGenerator } from "./python.ts";
import { RustGenerator } from "./rust.ts";

/**
 * Get a type generator by language name
 */
export function getTypeGenerator(language: string, config?: any): TypeGenerator {
  switch (language.toLowerCase()) {
    case "typescript":
    case "ts":
      return new TypeScriptGenerator(config);
    
    case "go":
    case "golang":
      return new GoGenerator(config);
    
    case "python":
    case "py":
      return new PythonGenerator(config);
    
    case "rust":
    case "rs":
      return new RustGenerator(config);
    
    default:
      throw new Error(`Unsupported language: ${language}. Supported languages: typescript, go, python, rust`);
  }
}