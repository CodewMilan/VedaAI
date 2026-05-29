import mongoose, { Schema, InferSchemaType } from "mongoose";

/**
 * A single reusable question saved to the teacher's personal Question Bank
 * ("My Library"). Questions can be saved from a generated paper (carrying a
 * back-reference to their source assignment) or authored manually.
 *
 * Single-tenant for now (mirrors Assignment / Group). When auth lands in the
 * backend we'll add `ownerId` and scope every query by it.
 */
const LibraryQuestionSchema = new Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    type: {
      type: String,
      enum: [
        "mcq",
        "short",
        "long",
        "true_false",
        "fill_blank",
        "diagram",
        "numerical",
      ],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "moderate", "hard"],
      default: "moderate",
    },
    marks: { type: Number, min: 0, max: 100, default: 1 },
    options: { type: [String], default: undefined },
    answer: { type: String, trim: true, maxlength: 2000 },
    subject: { type: String, trim: true, maxlength: 100 },
    topic: { type: String, trim: true, maxlength: 80 },
    /* Provenance — set when a question is saved straight from a paper. */
    sourceAssignmentId: { type: String },
    sourceTitle: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

LibraryQuestionSchema.index({ createdAt: -1 });
LibraryQuestionSchema.index({ subject: 1 });
LibraryQuestionSchema.index({ type: 1 });
LibraryQuestionSchema.index({ difficulty: 1 });
/* Text index powers the search box (question text + answer + topic). */
LibraryQuestionSchema.index({ text: "text", answer: "text", topic: "text" });

export type LibraryQuestionDoc = InferSchemaType<typeof LibraryQuestionSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const LibraryQuestion = mongoose.model(
  "LibraryQuestion",
  LibraryQuestionSchema
);
