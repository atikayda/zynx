/**
 * 🦎 Zynx CLI - Main Command Line Interface
 * 
 * Handles command routing and provides friendly axolotl-themed help
 */

import { GenerateCommand } from "./commands/generate.ts";
import { RunCommand } from "./commands/run.ts";
import { StatusCommand } from "./commands/status.ts";
import { InitCommand } from "./commands/init.ts";
import { RollbackCommand } from "./commands/rollback.ts";
import { GenerateTypesCommand } from "./commands/generate-types.ts";
import type { CLIOptions } from "../types.ts";
import { ErrorHandler } from "../utils/errors.ts";

export class CLI {
  private options: CLIOptions;
  
  constructor(options: CLIOptions) {
    this.options = options;
  }

  /**
   * Run the CLI with provided arguments
   */
  async run(args: string[]): Promise<void> {
    const command = args[0];
    const commandArgs = args.slice(1);

    switch (command) {
      case "generate":
        await this.runCommand(new GenerateCommand(this.options), commandArgs);
        break;

      case "run":
        await this.runCommand(new RunCommand(this.options), commandArgs);
        break;

      case "status":
        await this.runCommand(new StatusCommand(this.options), commandArgs);
        break;

      case "init":
        await this.runCommand(new InitCommand(this.options), commandArgs);
        break;

      case "rollback":
        await this.runCommand(new RollbackCommand(this.options), commandArgs);
        break;

      case "generate-types":
        await this.runCommand(new GenerateTypesCommand(this.options), commandArgs);
        break;

      default:
        console.error(`🚨 Unknown command: ${command}`);
        console.error("🦎 Use 'zynx --help' to see available commands");
        Deno.exit(1);
    }
  }

  /**
   * Execute a command with error handling
   */
  private async runCommand(command: Command, args: string[]): Promise<void> {
    try {
      await command.execute(args);
    } catch (error) {
      const err = ErrorHandler.fromUnknown(error);
      console.error(ErrorHandler.formatError(err, this.options.verbose));
      
      // Show user-friendly suggestion
      const userMessage = ErrorHandler.getUserMessage(err);
      console.error(`\n💡 ${userMessage}`);
      
      // Show command-specific help if available
      if (command.getHelp) {
        console.error(`\n📖 Command help:`);
        console.error(command.getHelp());
      }
      
      Deno.exit(1);
    }
  }
}

/**
 * Base command interface
 */
export interface Command {
  execute(args: string[]): Promise<void>;
  getHelp?(): string;
}