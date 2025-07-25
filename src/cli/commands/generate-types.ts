/**
 * 🦎 Zynx Generate Types Command - Generate type definitions from DBML schema
 * 
 * Generates type definitions in various programming languages (TypeScript, Go, Python, Rust)
 * from your DBML schema file.
 */

import { parseArgs } from "@std/cli/parse-args";
import { resolve } from "@std/path";
import { ensureDir } from "@std/fs";
import { Command } from "../cli.ts";
import { ErrorHandler } from "../../utils/errors.ts";
import { DBMLParser } from "../../core/dbml-parser.ts";
import { getTypeGenerator } from "../../generators/types/index.ts";
import type { CLIOptions } from "../../types.ts";
import { loadConfig } from "../../utils/config.ts";
import { applyFeatures, validateFeatures, getLanguageTypeMappings, getSQLTypeMappings } from "../../features/index.ts";

export class GenerateTypesCommand implements Command {
  private options: CLIOptions;

  constructor(options: CLIOptions) {
    this.options = options;
  }

  async execute(args: string[]): Promise<void> {
    try {
      // Debug: log raw args
      if (this.options.verbose) {
        console.log("Raw args:", args);
      }
      
      const parsedArgs = parseArgs(args, {
        string: ["language", "output", "schema", "style", "namespace", "features"],
        boolean: ["all", "serde", "diesel", "pydantic"],
        alias: {
          l: "language",
          o: "output",
          s: "schema",
          a: "all",
          f: "features",
        },
        default: {
          schema: "database.dbml",
        },
      });

      // Validate required arguments
      if (!parsedArgs.language && !parsedArgs.all) {
        throw new Error("🚨 Please specify a language with --language or use --all to generate all languages");
      }

      // Load configuration
      const config = await loadConfig(this.options.configPath);
      
      // Apply features if specified
      let features: string[] = [];
      if (parsedArgs.features) {
        features = parsedArgs.features.split(',').map((f: string) => f.trim());
      } else if (config.features) {
        features = config.features;
      }
      
      if (features.length > 0) {
        validateFeatures(features);
        // Get SQL type mappings for DBML parser
        const sqlTypeMappings = getSQLTypeMappings(features);
        // Apply SQL type mappings
        if (!config.schema) {
          config.schema = {} as any;
        }
        config.schema.typeMappings = sqlTypeMappings;
        // Store enabled features for later use
        (config as any).enabledFeatures = features;
      }
      
      // Read schema file
      const schemaPath = resolve(parsedArgs.schema || config.schema.path);
      const schemaContent = await Deno.readTextFile(schemaPath);
      
      // Parse DBML with config type mappings
      const parser = new DBMLParser({
        typeMappings: config.schema?.typeMappings
      });
      const schema = await parser.parse(schemaContent);

      if (this.options.verbose) {
        console.log(`📖 Parsed schema with ${schema.tables.length} tables`);
      }

      // Determine which languages to generate
      const languages = parsedArgs.all 
        ? ["typescript", "go", "python", "rust"]
        : [parsedArgs.language].filter(Boolean) as string[];

      // Generate types for each language
      for (const language of languages) {
        await this.generateForLanguage(language, schema, parsedArgs, config);
      }

      console.log("🎉 Type generation complete!");
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      throw err;
    }
  }

  private async generateForLanguage(language: string, schema: any, args: any, config: any): Promise<void> {
    try {
      if (this.options.verbose) {
        console.log(`Generating ${language} types...`);
      }
      // Build generator config from configuration
      const generatorConfig = this.buildGeneratorConfig(language, config, args);
      
      // Apply feature-based type mappings if features are enabled
      const features = (config as any).enabledFeatures || config.features || [];
      if (features.length > 0) {
        const { customTypes, imports } = getLanguageTypeMappings(features, language);
        generatorConfig.customTypes = { ...customTypes, ...generatorConfig.customTypes };
        generatorConfig.imports = { ...imports, ...generatorConfig.imports };
      }

      // Language-specific config
      switch (language.toLowerCase()) {
        case "python":
        case "py":
          if (args.pydantic) {
            generatorConfig.pythonStyle = "pydantic";
          } else if (args.style) {
            generatorConfig.pythonStyle = args.style;
          }
          break;
        
        case "rust":
        case "rs":
          generatorConfig.useSerde = args.serde !== false;
          generatorConfig.useDiesel = args.diesel === true;
          break;
      }

      // Get generator
      const generator = getTypeGenerator(language, generatorConfig);
      
      // Generate content
      const content = generator.generateFile(schema);
      
      // Determine output path
      let outputPath: string;
      if (args.output) {
        // If output is a directory, add filename
        if (args.output.endsWith("/")) {
          await ensureDir(args.output);
          outputPath = resolve(args.output, `schema${generator.fileExtension}`);
        } else {
          outputPath = resolve(args.output);
        }
      } else {
        // Default output path
        outputPath = resolve(`./${language}-types/schema${generator.fileExtension}`);
        await ensureDir(`./${language}-types`);
      }

      // Write file
      await Deno.writeTextFile(outputPath, content);
      
      if (this.options.verbose) {
        console.log(`✅ Generated ${language} types at: ${outputPath}`);
      } else {
        console.log(`✅ ${language}: ${outputPath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to generate ${language} types: ${errorMessage}`);
      if (this.options.verbose) {
        console.error(error);
      }
    }
  }

  private buildGeneratorConfig(language: string, config: any, args: any): any {
    const generatorConfig: any = {
      namespace: args.namespace,
      addComments: true,
      customTypes: {},
      imports: {}
    };

    // Get custom type definitions from config
    if (config.generators?.types) {
      const langKey = language.toLowerCase().replace("golang", "go").replace("py", "python").replace("ts", "typescript").replace("rs", "rust");
      
      // Build customTypes and imports from configured types
      for (const [typeName, typeDef] of Object.entries(config.generators.types)) {
        const langMapping = (typeDef as any)[langKey];
        if (langMapping) {
          generatorConfig.customTypes[typeName] = langMapping.type;
          if (langMapping.import) {
            generatorConfig.imports[langMapping.type] = langMapping.import;
          }
        }
      }
    }

    // Apply language-specific overrides if configured
    const langKey = language.toLowerCase().replace("golang", "go").replace("py", "python").replace("ts", "typescript").replace("rs", "rust");
    const langConfig = config.generators?.[langKey];
    
    if (langConfig) {
      if (langConfig.customTypes) {
        Object.assign(generatorConfig.customTypes, langConfig.customTypes);
      }
      if (langConfig.imports) {
        Object.assign(generatorConfig.imports, langConfig.imports);
      }
      if (langConfig.options) {
        Object.assign(generatorConfig, langConfig.options);
      }
    }

    return generatorConfig;
  }

  getHelp(): string {
    return `
🦎 Generate Types Command

Generate type definitions from your DBML schema in various programming languages.

Usage:
  zynx generate-types --language <language> [options]
  zynx generate-types --all [options]

Options:
  -l, --language <lang>    Target language (typescript, go, python, rust)
  -o, --output <path>      Output file or directory path
  -s, --schema <path>      DBML schema file (default: database.dbml)
  -a, --all                Generate types for all supported languages
  --namespace <name>       Namespace/module/package name for generated types
  --style <style>          Language-specific style options
  
Language-specific options:
  Python:
    --pydantic             Use Pydantic BaseModel (default: dataclass)
    --style <style>        Style: dataclass, typeddict, or pydantic
  
  Rust:
    --serde                Include serde derives (default: true)
    --diesel               Include diesel derives (default: false)

Examples:
  # Generate TypeScript types
  zynx generate-types --language typescript
  
  # Generate Go types with custom package name
  zynx generate-types --language go --namespace models
  
  # Generate Python Pydantic models
  zynx generate-types --language python --pydantic
  
  # Generate types for all languages
  zynx generate-types --all --output ./generated-types/
  
  # Generate Rust types with diesel support
  zynx generate-types --language rust --diesel --output ./src/models.rs
`;
  }
}