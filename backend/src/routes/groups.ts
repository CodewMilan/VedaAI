import { Router } from "express";
import mongoose from "mongoose";
import { Group } from "../models/Group";
import { Assignment } from "../models/Assignment";
import {
  CreateGroupSchema,
  UpdateGroupSchema,
  AssignToGroupsSchema,
} from "../types";
import { redis } from "../config/redis";

export const groupsRouter = Router();

/* ─────────── Create ─────────── */
groupsRouter.post("/", async (req, res) => {
  const parsed = CreateGroupSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", issues: parsed.error.issues });
  }
  const doc = await Group.create({
    ...parsed.data,
    classGrade: parsed.data.classGrade || undefined,
    section: parsed.data.section || undefined,
    subject: parsed.data.subject || undefined,
    description: parsed.data.description || undefined,
  });
  res.status(201).json(await serialiseWithCount(doc.toObject()));
});

/* ─────────── List ─────────── */
groupsRouter.get("/", async (_req, res) => {
  const docs = await Group.find().sort({ createdAt: -1 }).lean();
  const counts = await assignmentCountsByGroup();
  res.json(docs.map((d) => serialiseLeanWithCount(d, counts)));
});

/* ─────────── Detail (group + its assignments) ─────────── */
groupsRouter.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const doc = await Group.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: "Group not found" });

  const assignments = await Assignment.find({ groupIds: doc._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    ...serialiseLeanWithCount(doc, { [String(doc._id)]: assignments.length }),
    assignments: assignments.map(serialiseAssignmentLean),
  });
});

/* ─────────── Update ─────────── */
groupsRouter.put("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const parsed = UpdateGroupSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", issues: parsed.error.issues });
  }
  const update: Record<string, unknown> = { ...parsed.data };
  for (const k of ["classGrade", "section", "subject", "description"] as const) {
    if (update[k] === "") update[k] = undefined;
  }
  const doc = await Group.findByIdAndUpdate(req.params.id, update, {
    new: true,
  }).lean();
  if (!doc) return res.status(404).json({ error: "Group not found" });
  const counts = await assignmentCountsByGroup([String(doc._id)]);
  res.json(serialiseLeanWithCount(doc, counts));
});

/* ─────────── Delete ─────────── */
groupsRouter.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  const id = new mongoose.Types.ObjectId(req.params.id);
  /* Capture affected assignment ids BEFORE updating so we can invalidate
     their cache after the $pull — otherwise the find returns nothing
     (no doc still references the deleted group) and stale JSON lingers. */
  const stale = await Assignment.find({ groupIds: id }).select("_id").lean();
  /* Pull the deleted group id out of every assignment that referenced it
     so we don't leave dangling references. */
  await Assignment.updateMany(
    { groupIds: id },
    { $pull: { groupIds: id } }
  );
  await Promise.all(
    stale.map((s) =>
      redis.del(`vedaai:assignment:${String(s._id)}`).catch(() => {})
    )
  );
  await Group.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

/* ─────────── Assign existing assignments to a group ───────────
   Body: { assignmentIds: string[] }
   Idempotent — uses $addToSet so re-posting the same id is a no-op. */
groupsRouter.post("/:id/assignments", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Invalid group id" });
  }
  const parsed = AssignToGroupsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Validation failed", issues: parsed.error.issues });
  }
  const group = await Group.findById(req.params.id);
  if (!group) return res.status(404).json({ error: "Group not found" });

  const validIds = parsed.data.assignmentIds.filter((id) =>
    mongoose.isValidObjectId(id)
  );
  if (!validIds.length) {
    return res.status(400).json({ error: "No valid assignment ids supplied" });
  }

  await Assignment.updateMany(
    { _id: { $in: validIds } },
    { $addToSet: { groupIds: group._id } }
  );

  await Promise.all(
    validIds.map((id) =>
      redis.del(`vedaai:assignment:${id}`).catch(() => {})
    )
  );

  const assignments = await Assignment.find({ groupIds: group._id })
    .sort({ createdAt: -1 })
    .lean();
  res.json({
    groupId: String(group._id),
    assignments: assignments.map(serialiseAssignmentLean),
  });
});

/* ─────────── Unassign a single assignment from a group ─────────── */
groupsRouter.delete("/:id/assignments/:assignmentId", async (req, res) => {
  if (
    !mongoose.isValidObjectId(req.params.id) ||
    !mongoose.isValidObjectId(req.params.assignmentId)
  ) {
    return res.status(400).json({ error: "Invalid id" });
  }
  await Assignment.updateOne(
    { _id: req.params.assignmentId },
    { $pull: { groupIds: req.params.id } }
  );
  await redis
    .del(`vedaai:assignment:${req.params.assignmentId}`)
    .catch(() => {});
  res.status(204).end();
});

/* ─────────── helpers ─────────── */

async function assignmentCountsByGroup(
  ids?: string[]
): Promise<Record<string, number>> {
  const match: Record<string, unknown> = ids?.length
    ? { groupIds: { $in: ids.map((i) => new mongoose.Types.ObjectId(i)) } }
    : {};
  const rows = await Assignment.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
    { $match: match },
    { $unwind: "$groupIds" },
    ...(ids?.length
      ? [
          {
            $match: {
              groupIds: { $in: ids.map((i) => new mongoose.Types.ObjectId(i)) },
            },
          },
        ]
      : []),
    { $group: { _id: "$groupIds", n: { $sum: 1 } } },
  ]);
  const out: Record<string, number> = {};
  for (const r of rows) out[String(r._id)] = r.n;
  return out;
}

function serialiseLeanWithCount(
  doc: Record<string, unknown> & { _id: mongoose.Types.ObjectId },
  counts: Record<string, number>
) {
  const { _id, __v: _ignored, ...rest } = doc as Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    __v?: number;
  };
  return {
    id: String(_id),
    ...rest,
    assignmentCount: counts[String(_id)] ?? 0,
  };
}

async function serialiseWithCount(
  doc: Record<string, unknown> & { _id: mongoose.Types.ObjectId }
) {
  const counts = await assignmentCountsByGroup([String(doc._id)]);
  return serialiseLeanWithCount(doc, counts);
}

function serialiseAssignmentLean(doc: Record<string, unknown>) {
  const {
    _id,
    __v: _ignored,
    uploadedMaterial,
    groupIds,
    ...rest
  } = doc as Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    __v?: number;
    uploadedMaterial?: {
      filename?: string;
      mimeType?: string;
      sizeBytes?: number;
      extractedText?: string;
    };
    groupIds?: mongoose.Types.ObjectId[];
  };
  return {
    id: String(_id),
    ...rest,
    groupIds: (groupIds ?? []).map(String),
    uploadedMaterial: uploadedMaterial
      ? {
          filename: uploadedMaterial.filename,
          mimeType: uploadedMaterial.mimeType,
          sizeBytes: uploadedMaterial.sizeBytes,
          hasExtractedText: Boolean(uploadedMaterial.extractedText),
        }
      : undefined,
  };
}
