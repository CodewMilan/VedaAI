import mongoose, { Schema, InferSchemaType } from "mongoose";

const QuestionTypeConfigSchema = new Schema(
  {
    type: { type: String, required: true },
    count: { type: Number, required: true },
    marks: { type: Number, required: true },
  },
  { _id: false }
);

const QuestionSchema = new Schema(
  {
    number: { type: Number, required: true },
    text: { type: String, required: true },
    type: { type: String, required: true },
    difficulty: { type: String, required: true },
    marks: { type: Number, required: true },
    options: [{ type: String }],
    answer: { type: String },
  },
  { _id: false }
);

const SectionSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    instruction: { type: String, required: true },
    questions: { type: [QuestionSchema], default: [] },
  },
  { _id: false }
);

const PaperSchema = new Schema(
  {
    meta: {
      title: String,
      subject: String,
      classGrade: String,
      duration: String,
      totalMarks: Number,
      generalInstructions: [String],
    },
    sections: { type: [SectionSchema], default: [] },
  },
  { _id: false }
);

const UploadedMaterialSchema = new Schema(
  {
    filename: String,
    storedName: String,
    mimeType: String,
    sizeBytes: Number,
    extractedText: String,
  },
  { _id: false }
);

const AssignmentSchema = new Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    classGrade: String,
    dueDate: { type: Date, required: true },
    duration: String,
    questionTypes: { type: [QuestionTypeConfigSchema], default: [] },
    difficultyMix: {
      easy: { type: Number, default: 40 },
      moderate: { type: Number, default: 40 },
      hard: { type: Number, default: 20 },
    },
    additionalInstructions: String,
    uploadedMaterial: UploadedMaterialSchema,
    /* Many-to-many link to Group documents. Stored on the assignment side
       so listing "assignments for a group" is a single indexed query
       (`Assignment.find({ groupIds: groupId })`) and we don't risk drift. */
    groupIds: { type: [Schema.Types.ObjectId], default: [], index: true, ref: "Group" },
    status: {
      type: String,
      enum: ["draft", "queued", "processing", "completed", "failed"],
      default: "queued",
      index: true,
    },
    progress: { type: Number, default: 0 },
    stage: String,
    jobId: String,
    error: String,
    result: PaperSchema,
  },
  { timestamps: true }
);

AssignmentSchema.index({ createdAt: -1 });
AssignmentSchema.index({ status: 1, createdAt: -1 });

export type AssignmentDoc = InferSchemaType<typeof AssignmentSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const Assignment = mongoose.model("Assignment", AssignmentSchema);
