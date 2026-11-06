import { createFileRoute } from "@tanstack/react-router";
import { NawatChat } from "@/components/nawat/NawatChat";

export const Route = createFileRoute("/assistant/")({
  head: () => ({
    meta: [
      { title: "محادثة جديدة مع نواة — الوادي الأخضر" },
      { name: "description", content: "ابدأ محادثة جديدة مع مساعد التسوّق نواة." },
      { property: "og:title", content: "محادثة جديدة مع نواة" },
      { property: "og:description", content: "اسأل نواة عن أي حاجة أو اطلب اقتراحات مشتريات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <NawatChat key="new" />,
});
