/**
 * Type-safe branded types and utility types for Conductor
 *
 * Provides strongly-typed IDs and other type utilities to improve
 * type safety throughout the codebase.
 */

/**
 * Brand type helper for creating nominal types
 */
declare const brand: unique symbol;
type Brand<T, TBrand> = T & { [brand]: TBrand };

/**
 * Strongly-typed ID types for different entities
 */
export type ModeId = Brand<string, "ModeId">;
export type TemplateId = Brand<string, "TemplateId">;
export type SessionId = Brand<string, "SessionId">;
export type TaskId = Brand<string, "TaskId">;
export type StateId = Brand<string, "StateId">;

/**
 * Type guards for ID validation
 */
export function isModeId(value: unknown): value is ModeId {
  return typeof value === "string" && value.length > 0;
}

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && value.length > 0;
}

export function isSessionId(value: unknown): value is SessionId {
  return typeof value === "string" && value.length > 0;
}

/**
 * ID factory functions with validation
 */
export function createModeId(value: string): ModeId {
  if (!value || value.trim().length === 0) {
    throw new Error("ModeId cannot be empty");
  }
  // Validate mode ID format (lowercase, alphanumeric with hyphens)
  if (!/^[a-z0-9-]+$/.test(value)) {
    throw new Error("ModeId must be lowercase alphanumeric with hyphens only");
  }
  return value as ModeId;
}

export function createTemplateId(value: string): TemplateId {
  if (!value || value.trim().length === 0) {
    throw new Error("TemplateId cannot be empty");
  }
  // Validate template ID format (alphanumeric with underscores)
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error("TemplateId must be alphanumeric with underscores only");
  }
  return value as TemplateId;
}

export function createSessionId(value: string): SessionId {
  if (!value || value.trim().length === 0) {
    throw new Error("SessionId cannot be empty");
  }
  return value as SessionId;
}

export function createTaskId(value: string): TaskId {
  if (!value || value.trim().length === 0) {
    throw new Error("TaskId cannot be empty");
  }
  return value as TaskId;
}

export function createStateId(value: string): StateId {
  if (!value || value.trim().length === 0) {
    throw new Error("StateId cannot be empty");
  }
  return value as StateId;
}

/**
 * Well-known mode IDs as constants
 */
export const DISCOVERY_MODE_ID = createModeId("discovery");
export const PLANNING_MODE_ID = createModeId("planning");
export const DESIGN_MODE_ID = createModeId("design");
export const BUILD_MODE_ID = createModeId("build");
export const TEST_MODE_ID = createModeId("test");
export const POLISH_MODE_ID = createModeId("polish");

/**
 * Type utility to extract the raw string from a branded type
 */
export type UnwrapBrand<T> = T extends Brand<infer U, unknown> ? U : T;
