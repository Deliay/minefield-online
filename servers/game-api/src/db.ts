import mongoose from 'mongoose';

export interface IUser {
  username: string;
  displayName: string;
  passwordHash: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  passwordHash: { type: String, required: true },
  score: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.index({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const User = mongoose.model<IUser>('User', userSchema);

const MONGO_URI = process.env.MINEFIELD_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DATABASE || 'minefield';

export async function connectDB(): Promise<void> {
  if (!MONGO_URI) {
    throw new Error(
      'MongoDB 连接串缺失：请通过 Aspire AppHost 编排 MongoDB 并用 withReference(mongoDb) 自动注入 MINEFIELD_URI（禁止 docker 直接编排）。'
    );
  }
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}