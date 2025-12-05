import mongoose from 'mongoose';
export async function connectDB() {
  console.log({url:process.env.MONGO_DB_URL})
  console.log({redisURL:process.env.REDIS_URL})
  try {
    await mongoose.connect(process.env.MONGO_DB_URL);
    console.log('Database Connected');
  } catch (err) {
    console.error('mongodb connection error', err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  console.log('Database Disconnected');
  await mongoose.disconnect();
  process.exit(0);
});

// import { MongoClient } from 'mongodb';

// const URL = 'mongodb://sanjay:vicktoria@localhost:27017/storageApp';
// export const client = new MongoClient(URL);

// export async function connectDB() {
//   await client.connect();
//   const db = client.db('storageApp');
//   console.log('Connected successfully to server');
//   return db;
// }

// /* triggered when you manually stop the Node process (Ctrl + C) */
// process.on('SIGINT', async () => { //SIGINT=> signal intrupt
//   await client.close();
//   console.log('client disconnected');
//   process.exit();
// });
