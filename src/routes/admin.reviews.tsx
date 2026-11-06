import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { motion } from "motion/react";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({ meta: [{ title: "تقييمات المنتجات — لوحة التحكم" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ReviewsPage,
});

function ReviewsPage() {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6" dir="rtl">
    <div className="mx-auto max-w-2xl rounded-3xl border bg-card p-8 text-center shadow-sm">
      <MessageSquare className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
      <h1 className="font-display text-xl font-black">إدارة التقييمات غير متاحة في المخطط الحالي</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">قاعدة البيانات الحية تحتوي على rating و reviews_count داخل products فقط، ولا تحتوي على جدول reviews. لذلك لا نعرض أو نكتب بيانات تقييمات وهمية.</p>
    </div>
  </motion.div>;
}
