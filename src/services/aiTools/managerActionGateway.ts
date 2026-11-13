/**
 * src/services/aiTools/aiActionGateway.ts
 * Unified AI Action Gateway (Nawat + Nebras) — hardened edition.
 * - `confirmed` يُقبل فقط من الـ UI (request.confirmed) وليس من params الموديل.
 * - أي dry_run_simulation يتحول إلى approval_required.
 * - نبراس يتطلب دور admin/staff، والأدوات الحرجة تتطلب admin.
 * - userId في نواة يأتي من الـ session فقط.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  executeNebrasTool,
  type ImpactSummary,
  type NebrasToolName,
  type NebrasToolResult,
} from './nebrasManagerTools';
import {
  executeNawatTool,
  type NawatToolName,
  type NawatToolResult,
} from './nawatTools';
import {
  getClusterRisk,
  type AgentPersona,
  type ToolRiskCategory,
} from './toolClusters';

export type UnifiedToolResult = NebrasToolResult | NawatToolResult;

export interface GatewayActionRequest {
  agent: AgentPersona;
  toolName: string;
  params?: Record<string, unknown>;
  /** يجب أن يأتي من زر الموافقة في الـ UI فقط، لا من الموديل */
  confirmed?: boolean;
  /** معرّف المستخدم المسجل من الـ session (لنواة) */
  sessionUserId?: string | null;
}

export interface ApprovalPreviewCard {
  titleAr: string;
  toolName: string;
  action: string;
  riskLevel: ToolRiskCategory;
  summaryAr: string;
  impact: ImpactSummary;
  confirmationTokenPayload: {
    agent: AgentPersona;
    toolName: string;
    params: Record<string, unknown>;
  };
}

export interface GatewayActionResponse {
  status: 'success' | 'approval_required' | 'simulation' | 'error';
  agent: AgentPersona;
  toolName: string;
  riskLevel: ToolRiskCategory;
  summaryAr: string;
  result?: UnifiedToolResult;
  approvalCard?: ApprovalPreviewCard;
  error?: string;
}

const APPROVAL_REQUIRED_RISKS: ReadonlySet<ToolRiskCategory> = new Set([
  'HIGH_WRITE',
  'DESTRUCTIVE',
]);

const SAFE_READ_SUBACTIONS: ReadonlySet<string> = new Set([
  'list', 'list_coupons', 'list_pending_orders', 'check_low_stock',
  'view_profile', 'loyalty_summary', 'revenue_report', 'top_selling', 'dead_stock',
  'search', 'details', 'alternatives', 'categories', 'view',
  'list_my_orders', 'track_latest', 'order_details', 'active_offers',
  'validate_coupon', 'suggest_meal', 'check_area', 'branch_hours',
  'buy_again_list', 'list_favorites', 'profile_summary', 'loyalty_points',
  'policy_info',
]);

function resolveEffectiveRisk(
  toolName: string,
  params: Record<string, unknown>
): ToolRiskCategory {
  const subAction = String(params.action ?? '');
  if (SAFE_READ_SUBACTIONS.has(subAction)) return 'READ_ONLY';
  return getClusterRisk(toolName);
}

function errorResponse(
  agent: AgentPersona,
  toolName: string,
  riskLevel: ToolRiskCategory,
  summaryAr: string,
  error: string,
  result?: UnifiedToolResult
): GatewayActionResponse {
  return { status: 'error', agent, toolName, riskLevel, summaryAr, error, result };
}

async function assertNebrasRole(needsAdmin: boolean): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_my_role');
  if (error) return 'تعذر التحقق من صلاحياتك.';
  const role = data as string | null;
  if (role === 'admin') return null;
  if (role === 'staff' && !needsAdmin) return null;
  return needsAdmin
    ? 'هذه العملية تتطلب صلاحية مدير (admin).'
    : 'هذه الأدوات متاحة للإدارة والموظفين فقط.';
}

export async function executeAiAction(
  request: GatewayActionRequest
): Promise<GatewayActionResponse> {
  const { agent, toolName, confirmed = false, sessionUserId = null } = request;

  // 1) تنظيف params: الموديل لا يملك حق تمرير confirmed
  const rawParams = { ...(request.params ?? {}) };
  delete (rawParams as Record<string, unknown>).confirmed;

  // 2) نواة: userId من الـ session فقط
  const params: Record<string, unknown> =
    agent === 'nawat'
      ? { ...rawParams, userId: sessionUserId ?? undefined }
      : rawParams;

  const isConfirmed = confirmed === true;
  const effectiveRisk = resolveEffectiveRisk(toolName, params);
  const requiresApproval = APPROVAL_REQUIRED_RISKS.has(effectiveRisk);

  // 3) صلاحيات نبراس
  if (agent === 'nebras') {
    const roleError = await assertNebrasRole(requiresApproval);
    if (roleError) {
      return errorResponse(agent, toolName, effectiveRisk, roleError, 'FORBIDDEN');
    }
  }

  const executeTarget = async (flag: boolean): Promise<UnifiedToolResult> => {
    const merged = { ...params, confirmed: flag };
    return agent === 'nebras'
      ? executeNebrasTool(toolName as NebrasToolName, merged)
      : executeNawatTool(toolName as NawatToolName, merged);
  };

  // 4) تشغيل أولي (dry-run إن لم يكن مؤكداً)
  const result = await executeTarget(isConfirmed);

  if (!result.ok) {
    return errorResponse(
      agent, toolName, effectiveRisk, result.summaryAr,
      result.error ?? 'TOOL_ERROR', result
    );
  }

  // 5) أي dry-run يحتاج تأكيد => approval_required
  if (
    !isConfirmed &&
    result.mode === 'dry_run_simulation' &&
    result.impact?.requiresConfirmation !== false
  ) {
    const impact: ImpactSummary = result.impact ?? {
      affectedRecordsCount: 1,
      riskLevel: effectiveRisk === 'DESTRUCTIVE' ? 'critical' : 'high',
      requiresConfirmation: true,
    };

    return {
      status: 'approval_required',
      agent,
      toolName,
      riskLevel: effectiveRisk,
      summaryAr: result.summaryAr,
      result,
      approvalCard: {
        titleAr:
          effectiveRisk === 'DESTRUCTIVE'
            ? 'تأكيد عملية حساسة عالية التأثير'
            : 'مراجعة واعتماد تعديل البيانات',
        toolName,
        action: String(params.action ?? 'execute'),
        riskLevel: effectiveRisk,
        summaryAr: result.summaryAr,
        impact,
        // الـ UI يعيد الإرسال مع confirmed: true في الـ request نفسه
        confirmationTokenPayload: { agent, toolName, params: rawParams },
      },
    };
  }

  return {
    status: result.mode === 'stub_simulation' ? 'simulation' : 'success',
    agent,
    toolName,
    riskLevel: effectiveRisk,
    summaryAr: result.summaryAr,
    result,
  };
}