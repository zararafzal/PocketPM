/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiJobs from "../aiJobs.js";
import type * as aiUsage from "../aiUsage.js";
import type * as analyzeSprintRisk from "../analyzeSprintRisk.js";
import type * as cache from "../cache.js";
import type * as crons from "../crons.js";
import type * as dismissedFlags from "../dismissedFlags.js";
import type * as draftStatusUpdate from "../draftStatusUpdate.js";
import type * as embeddings from "../embeddings.js";
import type * as http from "../http.js";
import type * as jira from "../jira.js";
import type * as lib_callClaude from "../lib/callClaude.js";
import type * as lib_healthScorer from "../lib/healthScorer.js";
import type * as projects from "../projects.js";
import type * as rewriteTicket from "../rewriteTicket.js";
import type * as tickets from "../tickets.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiJobs: typeof aiJobs;
  aiUsage: typeof aiUsage;
  analyzeSprintRisk: typeof analyzeSprintRisk;
  cache: typeof cache;
  crons: typeof crons;
  dismissedFlags: typeof dismissedFlags;
  draftStatusUpdate: typeof draftStatusUpdate;
  embeddings: typeof embeddings;
  http: typeof http;
  jira: typeof jira;
  "lib/callClaude": typeof lib_callClaude;
  "lib/healthScorer": typeof lib_healthScorer;
  projects: typeof projects;
  rewriteTicket: typeof rewriteTicket;
  tickets: typeof tickets;
  users: typeof users;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
