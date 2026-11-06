import { createFileRoute } from "@tanstack/react-router";
import { NawatChat } from "@/components/nawat/NawatChat";

export const Route = createFileRoute("/assistant/$threadId")({
  head: () => ({
    meta: [
      { title: "محادثتك مع نواة — الوادي الأخضر" },
      { name: "description", content: "كمل محادثتك المحفوظة مع مساعد التسوّق نواة." },
      { property: "og:title", content: "محادثتك مع نواة" },
      { property: "og:description", content: "محادثة محفوظة مع مساعد التسوّق من الوادي الأخضر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  return <NawatChat key={threadId} threadId={threadId} />;
}
