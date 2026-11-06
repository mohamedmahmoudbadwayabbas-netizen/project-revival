import { classifyAiRisk } from "./aiActionGateway";
import { executeAiTool } from "./toolRouter";
import type { AiRiskLevel } from "./aiActionGateway";
import type { AiToolName, ToolExecutionContext, ToolExecutionResult } from "./types";

export type AiPlanStatus =
  | "PLAN_CREATED"
  | "STEP_PENDING"
  | "STEP_EXECUTING"
  | "STEP_EXECUTED"
  | "STEP_VERIFIED"
  | "PLAN_COMPLETED"
  | "PLAN_FAILED"
  | "PLAN_BLOCKED";

export type AiPlanStepStatus =
  | "PENDING"
  | "RUNNING"
  | "EXECUTED"
  | "VERIFIED"
  | "FAILED"
  | "BLOCKED";

export interface AiPlanStep {
  stepId: string;
  description: string;
  toolName: AiToolName;
  arguments: Record<string, unknown>;
  risk: AiRiskLevel;
  dependencies: string[];
  verificationRequired: boolean;
  status: AiPlanStepStatus;
  result?: ToolExecutionResult;
}

export interface AiPlan {
  planId: string;
  userIntent: string;
  steps: AiPlanStep[];
  status: AiPlanStatus;
}

export interface AiPlanExecutionResult {
  plan: AiPlan;
  success: boolean;
  status: AiPlanStatus;
  error?: string;
}

export function createAiPlan(
  userIntent: string,
  steps: Array<Omit<AiPlanStep, "risk" | "status"> & { risk?: AiRiskLevel }>,
): AiPlan {
  return {
    planId: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userIntent,
    status: "PLAN_CREATED",
    steps: steps.map((step) => ({
      ...step,
      risk: classifyAiRisk(step.toolName, step.arguments),
      status: "PENDING",
    })),
  };
}

function dependenciesSatisfied(step: AiPlanStep, completed: Set<string>): boolean {
  return step.dependencies.every((dependency) => completed.has(dependency));
}

function blockDependentSteps(plan: AiPlan, blockedStepIds: Set<string>): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of plan.steps) {
      if (
        step.status === "PENDING" &&
        step.dependencies.some((dependency) => blockedStepIds.has(dependency))
      ) {
        step.status = "BLOCKED";
        blockedStepIds.add(step.stepId);
        changed = true;
      }
    }
  }
}

export async function executeAiPlan(
  plan: AiPlan,
  context?: ToolExecutionContext,
): Promise<AiPlanExecutionResult> {
  const completed = new Set<string>();

  for (const step of plan.steps) {
    plan.status = "STEP_PENDING";
    if (!dependenciesSatisfied(step, completed)) {
      step.status = "BLOCKED";
      blockDependentSteps(plan, new Set([step.stepId]));
      plan.status = "PLAN_BLOCKED";
      return { plan, success: false, status: plan.status, error: `Dependencies are not satisfied for step ${step.stepId}.` };
    }

    step.status = "RUNNING";
    plan.status = "STEP_EXECUTING";
    const result = await executeAiTool(step.toolName, step.arguments, context);
    step.result = result;

    if (!result.ok || result.success === false) {
      const blocked = result.gatewayStatus === "approval_required";
      step.status = blocked ? "BLOCKED" : "FAILED";
      blockDependentSteps(plan, new Set([step.stepId]));
      plan.status = step.status === "BLOCKED" ? "PLAN_BLOCKED" : "PLAN_FAILED";
      return { plan, success: false, status: plan.status, error: result.error || result.messageAr };
    }

    step.status = "EXECUTED";
    plan.status = "STEP_EXECUTED";

    if (step.verificationRequired && result.verified !== true) {
      step.status = "FAILED";
      blockDependentSteps(plan, new Set([step.stepId]));
      plan.status = "PLAN_FAILED";
      return { plan, success: false, status: plan.status, error: result.verificationDetails || "Step verification failed." };
    }

    if (step.verificationRequired) {
      step.status = "VERIFIED";
      plan.status = "STEP_VERIFIED";
    }
    completed.add(step.stepId);
  }

  plan.status = "PLAN_COMPLETED";
  return { plan, success: true, status: plan.status };
}