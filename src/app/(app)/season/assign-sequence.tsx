"use client";

import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui";

/** Bulk action: confirm first, because it replaces the plan on every training week. */
export function AssignSequence({ action, count, group }: { action: () => Promise<void>; count: number; group: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Replace the plan on every ${group} training week with plans 1, 2, 3… in order? Plans you've picked by hand will be overwritten.`)) e.preventDefault();
      }}
    >
      <Button variant="secondary" size="sm"><Wand2 className="size-4" /> Assign {count} plans in order</Button>
    </form>
  );
}
