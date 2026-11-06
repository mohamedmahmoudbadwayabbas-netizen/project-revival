import { Moon, Sun } from "lucide-react";
import { useColorMode } from "@/lib/color-mode-context";
import { Button } from "@/components/ui/button";

export function ColorModeToggle({ className }: { className?: string }) {
  const { mode, toggle } = useColorMode();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={mode === "dark" ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن"}
      className={className}
    >
      {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
