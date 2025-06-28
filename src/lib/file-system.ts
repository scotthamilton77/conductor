/**
 * File System Management for Conductor
 *
 * Provides abstraction layer for .conductor directory operations
 */

import { ensureDir, exists } from "https://deno.land/std@0.207.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.207.0/path/mod.ts";

const CONDUCTOR_MODES = ["discovery", "planning", "design", "build", "test", "polish"] as const;

export class FileSystemManager {
  private readonly conductorDir = ".conductor";
  private readonly modes = CONDUCTOR_MODES;

  constructor(private readonly basePath: string = Deno.cwd()) {}

  /**
   * Get the full path to the .conductor directory
   */
  get conductorPath(): string {
    return join(this.basePath, this.conductorDir);
  }

  /**
   * Initialize the .conductor directory structure
   */
  async initialize(): Promise<void> {
    // Create main .conductor directory
    await ensureDir(this.conductorPath);

    // Create mode-specific subdirectories
    for (const mode of this.modes) {
      await ensureDir(join(this.conductorPath, mode));
    }
  }

  /**
   * Check if .conductor directory exists
   */
  async exists(): Promise<boolean> {
    return await exists(this.conductorPath);
  }

  /**
   * Validate the directory structure
   */
  async validate(): Promise<{ valid: boolean; missing: string[] }> {
    const missing: string[] = [];

    // Check main directory
    if (!await exists(this.conductorPath)) {
      missing.push(this.conductorDir);
      return { valid: false, missing };
    }

    // Check subdirectories
    for (const mode of this.modes) {
      const modePath = join(this.conductorPath, mode);
      if (!await exists(modePath)) {
        missing.push(`${this.conductorDir}/${mode}`);
      }
    }

    return { valid: missing.length === 0, missing };
  }

  /**
   * Get path to a specific mode directory
   */
  getModePath(mode: typeof this.modes[number]): string {
    return join(this.conductorPath, mode);
  }

  /**
   * Get path to a file within the .conductor directory
   */
  getFilePath(relativePath: string): string {
    return join(this.conductorPath, relativePath);
  }

  /**
   * Ensure a directory exists within .conductor
   */
  async ensureDirectory(relativePath: string): Promise<void> {
    const fullPath = this.getFilePath(relativePath);
    await ensureDir(fullPath);
  }

  /**
   * Check if a file or directory exists within .conductor
   */
  async fileExists(relativePath: string): Promise<boolean> {
    const fullPath = this.getFilePath(relativePath);
    return await exists(fullPath);
  }
}

export type ConductorMode = typeof CONDUCTOR_MODES[number];
