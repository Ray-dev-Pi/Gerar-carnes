import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (process.env.VERCEL && env.mongodbUri.includes('127.0.0.1')) {
    throw new Error(
      'Configure MONGODB_URI com uma URL do MongoDB Atlas na Vercel. 127.0.0.1 nao funciona em producao.'
    );
  }

  if (env.mongodbUri.includes('<db_password>')) {
    throw new Error(
      'Substitua <db_password> pela senha real do usuario do MongoDB Atlas na variavel MONGODB_URI.'
    );
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName,
    serverSelectionTimeoutMS: 8000
  });
  console.log(`MongoDB conectado em ${env.mongodbUri}`);
  return mongoose.connection;
}
