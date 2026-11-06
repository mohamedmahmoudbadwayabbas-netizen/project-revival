import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronUp,
  Info,
  Leaf,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
} from "lucide-react";

/**
 * أيقونات تصميم نواة.
 *
 * ملاحظة مهمة: تعذر تنزيل ملفات SVG الأصلية من فيجما داخل بيئة التنفيذ (الشبكة
 * تمنع www.figma.com)، لذلك استُخدمت أيقونات lucide المطابقة في المعنى كبديل مؤقت،
 * وعلامة نواة مرسومة تقريبيًا. للحصول على تطابق 100% صدّر الأيقونات من فيجما
 * (Nawat Mark / icon/*) إلى src/assets/nawat واستبدل هذا الملف فقط؛ كل المكونات
 * تستورد الأيقونات من هنا.
 */
export const IconCart = ShoppingCart;
export const IconArrowBack = ArrowRight;
export const IconCheck = Check;
export const IconChevronUp = ChevronUp;
export const IconPlus = Plus;
export const IconSwap = ArrowLeftRight;
export const IconInfo = Info;
export const IconBox = Package;
export const IconEdit = Pencil;
export const IconAlert = AlertCircle;
export const IconSearch = Search;
export const IconLeaf = Leaf;

interface NawatMarkProps {
  size?: number;
  /** عدد الأقواس المضيئة (0–3). تتغير فقط عند أحداث تنفيذ فعلية. */
  activeArcs?: 0 | 1 | 2 | 3;
  /** يدور أثناء المعالجة؛ يتوقف تلقائيًا عند تفضيل تقليل الحركة. */
  spinning?: boolean;
  className?: string;
}

/** علامة نواة: ثلاثة أقواس حول نقطة مركزية. */
export function NawatMark({ size = 40, activeArcs, spinning = false, className }: NawatMarkProps) {
  const lit = (index: number) =>
    activeArcs === undefined || index < activeArcs ? "var(--nw-indigo)" : "var(--nw-indigo-mid)";
  const arc = (startDeg: number) => {
    const span = 80;
    const radius = 15;
    const toPoint = (deg: number) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return `${(20 + radius * Math.cos(rad)).toFixed(2)} ${(20 + radius * Math.sin(rad)).toFixed(2)}`;
    };
    return `M ${toPoint(startDeg)} A ${radius} ${radius} 0 0 1 ${toPoint(startDeg + span)}`;
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={["nw-mark", spinning ? "nw-mark--spin" : "", className ?? ""].join(" ").trim()}
    >
      <g className="nw-mark__arcs" strokeWidth="4.5" strokeLinecap="round">
        <path d={arc(-40)} stroke={lit(0)} />
        <path d={arc(80)} stroke={lit(1)} />
        <path d={arc(200)} stroke={lit(2)} />
      </g>
      <circle cx="20" cy="20" r="5" fill="var(--nw-indigo)" />
    </svg>
  );
}
