"use client";

import * as React from "react";
import { Plus, Users, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGroupsStore } from "@/store/groups";
import { GroupCard } from "@/components/groups/group-card";
import { GroupFormDialog } from "@/components/groups/group-form-dialog";
import type { Group } from "@/lib/types";

export function GroupsView() {
  const { byId, order, loaded, loading, error, fetchAll } = useGroupsStore();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Group | null>(null);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const list = order.map((id) => byId[id]).filter(Boolean);
  const isInitialLoading = !loaded && loading;
  const isEmpty = loaded && list.length === 0;

  return (
    <>
      <PageHeader
        title="My Groups"
        subtitle="Organise the classes you teach. Assign papers to a group in one click."
        count={list.length}
        onCreate={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
      />

      {isInitialLoading ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorPanel message={error} onRetry={() => fetchAll()} />
      ) : isEmpty ? (
        <EmptyGroups
          onCreate={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-10 sm:grid-cols-2">
          {list.map((g) => (
            <GroupCard
              key={g.id}
              g={g}
              onEdit={(group) => {
                setEditing(group);
                setDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <GroupFormDialog
        open={dialogOpen}
        initial={editing ?? undefined}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

function PageHeader({
  title,
  subtitle,
  count,
  onCreate,
}: {
  title: string;
  subtitle: string;
  count?: number;
  onCreate: () => void;
}) {
  return (
    <div className="mb-8 flex items-start gap-3">
      <span className="mt-[10px] h-2 w-2 shrink-0 rounded-full bg-[#ff5623]" />
      <div className="flex-1">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-foreground sm:text-[24px]">
            {title}
          </h1>
          {typeof count === "number" && count > 0 && (
            <span className="rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        <p className="mt-1 text-[13.5px] text-muted-foreground sm:text-[14px]">
          {subtitle}
        </p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full bg-[#181818] px-5 text-[14px] font-medium text-white",
          "transition-colors duration-150 hover:bg-[#303030]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <Plus className="h-4 w-4" />
        New group
      </button>
    </div>
  );
}

function EmptyGroups({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[calc(100vh-260px)] w-full flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#fff0ea] text-[#ff5623]">
          <Users className="h-9 w-9" strokeWidth={1.8} />
        </div>
        <div className="flex max-w-[460px] flex-col items-center gap-1">
          <h3
            className="text-[20px] font-bold leading-[1.4] tracking-[-0.04em] text-[#303030]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            No groups yet
          </h3>
          <p
            className="text-[16px] leading-[1.4] tracking-[-0.04em] text-[rgba(94,94,94,0.8)]"
            style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
          >
            Create a group for each class you teach so you can assign papers,
            track progress, and stay organised in one place.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className={cn(
          "inline-flex items-center gap-1 rounded-[48px] border-[1.5px] border-[rgba(255,255,255,0.5)] bg-[#181818] px-6 py-3 text-[16px] font-medium tracking-[-0.04em] text-white",
          "transition-transform duration-150 hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5623] focus-visible:ring-offset-2"
        )}
        style={{ fontVariationSettings: "'opsz' 14, 'wdth' 100" }}
      >
        <Plus className="h-5 w-5" strokeWidth={2.2} />
        Create Your First Group
      </button>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/60 px-6 py-16 text-center backdrop-blur">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0ea] text-[#c53535]">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-[16px] font-semibold text-foreground">
        Couldn&rsquo;t load your groups
      </h3>
      <p className="max-w-md text-[13.5px] text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex h-10 items-center rounded-full bg-[#181818] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#303030]"
      >
        Try again
      </button>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-[162px] animate-pulse rounded-[24px] bg-white/70 card-shadow"
        >
          <Loader2 className="sr-only" />
        </div>
      ))}
    </div>
  );
}
