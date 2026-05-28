"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { ActionBar } from "@/components/output/action-bar";
import { GeneratingState } from "@/components/output/generating-state";
import { PaperView } from "@/components/output/paper-view";
import { Card } from "@/components/ui/card";
import { useAssignmentsStore } from "@/store/assignments";
import { getAssignment } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type {
  Assignment,
  SocketAssignmentEvent,
} from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function AssignmentDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");

  const upsert = useAssignmentsStore((s) => s.upsert);
  const applyEvent = useAssignmentsStore((s) => s.applyEvent);
  const stored = useAssignmentsStore((s) => s.byId[id]);

  const [error, setError] = React.useState<string | null>(null);
  const [loaded, setLoaded] = React.useState(Boolean(stored));

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const a = await getAssignment(id);
        if (!cancelled) {
          upsert(a);
          setLoaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load";
          setError(msg);
          toast.error(msg);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, upsert]);

  React.useEffect(() => {
    const socket = getSocket();
    socket.emit("subscribe:assignment", id);
    const onUpdate = (e: SocketAssignmentEvent) => {
      if (e.assignmentId !== id) return;
      applyEvent(e);
      if (e.status === "completed") {
        toast.success("Paper generated");
      }
      if (e.status === "failed") {
        toast.error(`Generation failed: ${e.error ?? "unknown"}`);
      }
    };
    socket.on("assignment:update", onUpdate);
    return () => {
      socket.off("assignment:update", onUpdate);
      socket.emit("unsubscribe:assignment", id);
    };
  }, [id, applyEvent]);

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center card-shadow">
          <h2 className="text-[18px] font-bold tracking-[-0.02em] text-foreground">
            Couldn't load this assignment
          </h2>
          <p className="mt-2 text-[14px] text-muted-foreground">{error}</p>
        </div>
      </AppShell>
    );
  }

  if (!loaded || !stored) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-xl items-center justify-center gap-3 rounded-2xl bg-white p-12 card-shadow">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-[14px] text-muted-foreground">Loading…</span>
        </div>
      </AppShell>
    );
  }

  const assignment = stored as Assignment;

  const isReady = assignment.status === "completed" && !!assignment.result;

  return (
    <AppShell>
      {isReady ? (
        /* Figma 2:10682 — dark gray outer container wraps the chat header + paper */
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-col gap-3 rounded-[32px] bg-[#5e5e5e] p-3 sm:p-5">
            <ActionBar assignment={assignment} />
            <PaperView assignment={assignment} paper={assignment.result!} />
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-5xl">
          <GeneratingState assignment={assignment} />
        </div>
      )}
    </AppShell>
  );
}
