import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type InputType = 'upload' | 'camera' | 'pad' | 'typed';

export interface IStep {
  rule: string;
  description: string;
  before: string;
  after: string;
}

export interface IAnswer {
  exact: string[];
  decimal?: number[];
  verified: boolean;
}

export interface IStrokePoint {
  x: number;
  y: number;
  time?: number;
}

export interface IProblem extends Document {
  userId?: Types.ObjectId;
  inputType: InputType;
  recognizedText?: string;
  finalExpression: string;
  latex?: string;
  problemType: string;
  answer: IAnswer;
  steps: IStep[];
  strokes?: IStrokePoint[][];
  thumbnail?: string; // Max ~30KB base64 or small image
  corrected: boolean;
  favorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StepSchema = new Schema<IStep>(
  {
    rule: { type: String, required: true },
    description: { type: String, required: true },
    before: { type: String, required: true },
    after: { type: String, required: true },
  },
  { _id: false }
);

const AnswerSchema = new Schema<IAnswer>(
  {
    exact: [{ type: String, required: true }],
    decimal: [{ type: Number }],
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProblemSchema = new Schema<IProblem>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    inputType: {
      type: String,
      enum: ['upload', 'camera', 'pad', 'typed'],
      required: true,
    },
    recognizedText: {
      type: String,
      default: '',
    },
    finalExpression: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    latex: {
      type: String,
      default: '',
    },
    problemType: {
      type: String,
      required: true,
    },
    answer: {
      type: AnswerSchema,
      required: true,
    },
    steps: {
      type: [StepSchema],
      default: [],
    },
    strokes: {
      type: Schema.Types.Mixed,
    },
    thumbnail: {
      type: String,
    },
    corrected: {
      type: Boolean,
      default: false,
    },
    favorite: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user query performance (newest first)
ProblemSchema.index({ userId: 1, createdAt: -1 });

// Text index for searching expressions in history
ProblemSchema.index({ finalExpression: 'text' });

// Prevent re-compilation during hot reloads
export const Problem: Model<IProblem> =
  mongoose.models.Problem || mongoose.model<IProblem>('Problem', ProblemSchema);

export default Problem;
