/**
 * Core File Operations API
 *
 * Provides unified file operations within .conductor/ directory with
 * Git-friendly formatting, atomic writes, and comprehensive validation
 */

import { ensureDir, exists } from "@std/fs";
import { dirname, join } from "@std/path";
import { FileSystemManager } from "./file-system.ts";
import { type Logger } from "./types.ts";

export interface FileOperationOptions {
  encoding?: "utf-8";
  atomicWrite?: boolean;
  createDirs?: boolean;
  validateSize?: boolean;
  maxSize?: number; // in bytes
  backup?: boolean;
}

export interface FileMetadata {
  path: string;
  size: number;
  created: Date;
  modified: Date;
  encoding: string;
  checksum?: string;
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: FileMetadata;
}

export interface AtomicWriteResult {
  success: boolean;
  tempPath?: string;
  finalPath: string;
  bytesWritten: number;
}

export class FileOperations {
  private readonly fsManager: FileSystemManager;
  private readonly logger?: Logger;
  private readonly defaultOptions: Required<FileOperationOptions>;

  constructor(_basePath?: string, logger?: Logger) {
    // Always use project root as base path, FileSystemManager handles .conductor internally
    this.fsManager = new FileSystemManager();
    this.logger = logger;
    this.defaultOptions = {
      encoding: "utf-8",
      atomicWrite: true,
      createDirs: true,
      validateSize: true,
      maxSize: 10 * 1024 * 1024, // 10MB default
      backup: false,
    };
  }

  /**
   * Read file contents with validation and metadata
   */
  async readFile(
    relativePath: string,
    options: Partial<FileOperationOptions> = {},
  ): Promise<{ content: string; metadata: FileMetadata }> {
    const opts = { ...this.defaultOptions, ...options };
    const fullPath = this.fsManager.getFilePath(relativePath);

    this.logger?.debug(`AI: Reading file: ${fullPath}`);

    try {
      // Validate file exists and is accessible
      const validation = await this.validateFile(fullPath, opts);
      if (!validation.valid) {
        throw new Error(`File validation failed: ${validation.errors.join(", ")}`);
      }

      // Read file content
      const content = await Deno.readTextFile(fullPath);

      // Log warnings if any
      if (validation.warnings.length > 0) {
        this.logger?.warn(
          `AI: File warnings for ${relativePath}: ${validation.warnings.join(", ")}`,
        );
      }

      return {
        content: this.normalizeLineEndings(content),
        metadata: validation.metadata!,
      };
    } catch (error) {
      this.logger?.error(`AI: Failed to read file ${relativePath}: ${error}`);
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`File not found: ${relativePath}`);
      }
      if (error instanceof Deno.errors.PermissionDenied) {
        throw new Error(`Permission denied: ${relativePath}`);
      }
      throw new Error(
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Write file with atomic operations and validation
   */
  async writeFile(
    relativePath: string,
    content: string,
    options: Partial<FileOperationOptions> = {},
  ): Promise<AtomicWriteResult> {
    const opts = { ...this.defaultOptions, ...options };
    const fullPath = this.fsManager.getFilePath(relativePath);

    this.logger?.debug(`AI: Writing file: ${fullPath} (${content.length} chars)`);

    try {
      // Validate content before writing
      this.validateContent(content, opts);

      // Ensure parent directory exists
      if (opts.createDirs) {
        await ensureDir(dirname(fullPath));
      }

      // Normalize content for Git-friendly format
      const normalizedContent = this.normalizeContent(content);
      const encoder = new TextEncoder();
      const bytes = encoder.encode(normalizedContent);

      let result: AtomicWriteResult;

      if (opts.atomicWrite) {
        result = await this.atomicWrite(fullPath, bytes);
      } else {
        await Deno.writeFile(fullPath, bytes, { create: true });
        result = {
          success: true,
          finalPath: fullPath,
          bytesWritten: bytes.length,
        };
      }

      this.logger?.info(`AI: Successfully wrote ${result.bytesWritten} bytes to ${relativePath}`);
      return result;
    } catch (error) {
      this.logger?.error(`AI: Failed to write file ${relativePath}: ${error}`);
      throw new Error(
        `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update file content with backup option
   */
  async updateFile(
    relativePath: string,
    updater: (currentContent: string) => string,
    options: Partial<FileOperationOptions> = {},
  ): Promise<AtomicWriteResult> {
    const opts = { ...this.defaultOptions, ...options };

    this.logger?.debug(`AI: Updating file: ${relativePath}`);

    try {
      // Read current content
      const { content: currentContent } = await this.readFile(relativePath, opts);

      // Create backup if requested
      if (opts.backup) {
        await this.createBackup(relativePath);
      }

      // Apply update function
      const newContent = updater(currentContent);

      // Write updated content
      return await this.writeFile(relativePath, newContent, opts);
    } catch (error) {
      this.logger?.error(`AI: Failed to update file ${relativePath}: ${error}`);
      throw error;
    }
  }

  /**
   * Delete file with validation
   */
  async deleteFile(relativePath: string): Promise<void> {
    const fullPath = this.fsManager.getFilePath(relativePath);

    this.logger?.debug(`AI: Deleting file: ${fullPath}`);

    try {
      // Validate file exists
      if (!await exists(fullPath)) {
        throw new Error(`File not found: ${relativePath}`);
      }

      // Check if it's actually a file, not a directory
      const stat = await Deno.stat(fullPath);
      if (!stat.isFile) {
        throw new Error(`Path is not a file: ${relativePath}`);
      }

      await Deno.remove(fullPath);
      this.logger?.info(`AI: Successfully deleted file: ${relativePath}`);
    } catch (error) {
      this.logger?.error(`AI: Failed to delete file ${relativePath}: ${error}`);
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * List files in a directory with metadata
   */
  async listFiles(
    relativePath: string = "",
    options: { recursive?: boolean; pattern?: RegExp } = {},
  ): Promise<FileMetadata[]> {
    const fullPath = relativePath
      ? this.fsManager.getFilePath(relativePath)
      : this.fsManager.conductorPath;

    this.logger?.debug(`AI: Listing files in: ${fullPath}`);

    try {
      const files: FileMetadata[] = [];

      for await (const entry of Deno.readDir(fullPath)) {
        if (entry.isFile) {
          const filePath = join(fullPath, entry.name);
          const relativePath = this.getRelativePath(filePath);

          // Apply pattern filter if provided
          if (options.pattern && !options.pattern.test(entry.name)) {
            continue;
          }

          try {
            const stat = await Deno.stat(filePath);
            files.push({
              path: relativePath,
              size: stat.size,
              created: stat.birthtime || stat.mtime || new Date(),
              modified: stat.mtime || new Date(),
              encoding: "utf-8", // Default assumption
            });
          } catch (error) {
            this.logger?.warn(`AI: Failed to stat file ${filePath}: ${error}`);
          }
        } else if (entry.isDirectory && options.recursive) {
          const subPath = relativePath ? join(relativePath, entry.name) : entry.name;
          const subFiles = await this.listFiles(subPath, options);
          files.push(...subFiles);
        }
      }

      return files.sort((a, b) => a.path.localeCompare(b.path));
    } catch (error) {
      this.logger?.error(`AI: Failed to list files in ${relativePath}: ${error}`);
      throw new Error(
        `Failed to list files: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if file exists
   */
  async exists(relativePath: string): Promise<boolean> {
    return await this.fsManager.fileExists(relativePath);
  }

  /**
   * Get file metadata
   */
  async getMetadata(relativePath: string): Promise<FileMetadata> {
    const fullPath = this.fsManager.getFilePath(relativePath);

    try {
      const stat = await Deno.stat(fullPath);
      return {
        path: relativePath,
        size: stat.size,
        created: stat.birthtime || stat.mtime || new Date(),
        modified: stat.mtime || new Date(),
        encoding: "utf-8", // Default assumption
      };
    } catch (error) {
      throw new Error(
        `Failed to get metadata: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Copy file within .conductor directory
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    this.logger?.debug(`AI: Copying file from ${sourcePath} to ${destPath}`);

    try {
      const { content } = await this.readFile(sourcePath);
      await this.writeFile(destPath, content);
      this.logger?.info(`AI: Successfully copied file from ${sourcePath} to ${destPath}`);
    } catch (error) {
      this.logger?.error(`AI: Failed to copy file: ${error}`);
      throw error;
    }
  }

  /**
   * Move/rename file within .conductor directory
   */
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    this.logger?.debug(`AI: Moving file from ${sourcePath} to ${destPath}`);

    try {
      await this.copyFile(sourcePath, destPath);
      await this.deleteFile(sourcePath);
      this.logger?.info(`AI: Successfully moved file from ${sourcePath} to ${destPath}`);
    } catch (error) {
      this.logger?.error(`AI: Failed to move file: ${error}`);
      // Try to clean up destination file if copy succeeded but delete failed
      try {
        if (await this.exists(destPath)) {
          await this.deleteFile(destPath);
        }
      } catch (cleanupError) {
        this.logger?.warn(
          `AI: Failed to cleanup destination file after move failure: ${cleanupError}`,
        );
      }
      throw error;
    }
  }

  /**
   * Initialize .conductor directory structure
   */
  async initialize(): Promise<void> {
    this.logger?.info("AI: Initializing .conductor directory structure");
    await this.fsManager.initialize();
  }

  /**
   * Validate .conductor directory structure
   */
  async validateStructure(): Promise<{ valid: boolean; missing: string[] }> {
    return await this.fsManager.validate();
  }

  /**
   * Atomic write operation
   */
  private async atomicWrite(filePath: string, data: Uint8Array): Promise<AtomicWriteResult> {
    const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;

    try {
      // Write to temporary file first
      await Deno.writeFile(tempPath, data, { create: true });

      // Verify write was successful
      const stat = await Deno.stat(tempPath);
      if (stat.size !== data.length) {
        throw new Error(
          `Atomic write verification failed: expected ${data.length} bytes, got ${stat.size}`,
        );
      }

      // Atomically move temp file to final location
      await Deno.rename(tempPath, filePath);

      return {
        success: true,
        tempPath,
        finalPath: filePath,
        bytesWritten: data.length,
      };
    } catch (error) {
      // Clean up temp file on failure
      try {
        await Deno.remove(tempPath);
      } catch (cleanupError) {
        this.logger?.warn(`AI: Failed to cleanup temp file ${tempPath}: ${cleanupError}`);
      }
      throw error;
    }
  }

  /**
   * Validate file before operations
   */
  private async validateFile(
    filePath: string,
    options: Required<FileOperationOptions>,
  ): Promise<FileValidationResult> {
    const result: FileValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check if file exists
      if (!await exists(filePath)) {
        result.valid = false;
        result.errors.push("File does not exist");
        return result;
      }

      // Get file metadata
      const stat = await Deno.stat(filePath);

      if (!stat.isFile) {
        result.valid = false;
        result.errors.push("Path is not a file");
        return result;
      }

      // Check file size
      if (options.validateSize && stat.size > options.maxSize) {
        result.valid = false;
        result.errors.push(`File size ${stat.size} exceeds maximum ${options.maxSize} bytes`);
        return result;
      }

      // Add size warning if file is large
      if (stat.size > options.maxSize * 0.8) {
        result.warnings.push(`File size ${stat.size} is approaching maximum limit`);
      }

      result.metadata = {
        path: filePath,
        size: stat.size,
        created: stat.birthtime || stat.mtime || new Date(),
        modified: stat.mtime || new Date(),
        encoding: options.encoding,
      };
    } catch (error) {
      result.valid = false;
      result.errors.push(
        `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return result;
  }

  /**
   * Validate content before writing
   */
  private validateContent(content: string, options: Required<FileOperationOptions>): void {
    // Check content size
    const encoder = new TextEncoder();
    const size = encoder.encode(content).length;

    if (options.validateSize && size > options.maxSize) {
      throw new Error(`Content size ${size} exceeds maximum ${options.maxSize} bytes`);
    }

    // Check for binary content (basic heuristic)
    if (content.includes("\0")) {
      throw new Error("Binary content not allowed in text files");
    }
  }

  /**
   * Normalize content for Git-friendly format
   */
  private normalizeContent(content: string): string {
    // Ensure LF line endings (Git-friendly)
    let normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Ensure file ends with newline
    if (normalized.length > 0 && !normalized.endsWith("\n")) {
      normalized += "\n";
    }

    return normalized;
  }

  /**
   * Normalize line endings in read content
   */
  private normalizeLineEndings(content: string): string {
    return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  /**
   * Create backup of file
   */
  private async createBackup(relativePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${relativePath}.backup.${timestamp}`;

    await this.copyFile(relativePath, backupPath);
    this.logger?.info(`AI: Created backup: ${backupPath}`);

    return backupPath;
  }

  /**
   * Get relative path from full path
   */
  private getRelativePath(fullPath: string): string {
    const conductorPath = this.fsManager.conductorPath;
    return fullPath.startsWith(conductorPath) ? fullPath.slice(conductorPath.length + 1) : fullPath;
  }
}

// Default instance for common use cases
export const fileOperations = new FileOperations();
