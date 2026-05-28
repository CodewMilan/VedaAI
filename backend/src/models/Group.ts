import mongoose, { Schema, InferSchemaType } from "mongoose";

/**
 * A teaching group — typically a real classroom the teacher meets with
 * (e.g. "Class 10A — Physics"). Assignments are linked to groups via the
 * `groupIds` array on the Assignment document (many-to-many), so we don't
 * duplicate the list of assignment ids here.
 *
 * Single-tenant for now (mirrors the current Assignment model). When auth
 * is wired into the backend we'll add `ownerId` and scope queries.
 */
const GroupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    classGrade: { type: String, trim: true, maxlength: 30 },
    section: { type: String, trim: true, maxlength: 10 },
    subject: { type: String, trim: true, maxlength: 80 },
    studentCount: { type: Number, min: 0, max: 1000 },
    color: {
      type: String,
      enum: ["orange", "blue", "green", "purple", "pink", "yellow"],
      default: "orange",
    },
    description: { type: String, trim: true, maxlength: 280 },
  },
  { timestamps: true }
);

GroupSchema.index({ createdAt: -1 });
GroupSchema.index({ name: 1 });

export type GroupDoc = InferSchemaType<typeof GroupSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Group = mongoose.model("Group", GroupSchema);
