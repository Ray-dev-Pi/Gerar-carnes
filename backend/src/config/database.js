import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri);
  console.log(`MongoDB conectado em ${env.mongodbUri}`);
  return mongoose.connection;
}
