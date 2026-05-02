import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri);
  console.log(`MongoDB conectado em ${env.mongodbUri}`);
}
