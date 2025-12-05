// we don't import this code anywhere we keep this code to run manually , we kept this code here so that git can track this file changes.it help use to easily revert back into your older schema

import mongoose from 'mongoose';
import { connectDB } from './db.js';

await connectDB();
const client = mongoose.connection.getClient();
try {
  const db = mongoose.connection.db;
  // create dbSchema so that we don't need to write  await db.command() again and again
  const command = 'collMod';
  const dbSchema = [
    {
      [command]: 'users',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['_id', 'name', 'email', 'rootDirId', 'updatedAt', 'createdAt', 'storageLimit'],
          properties: {
            _id: {
              bsonType: 'objectId',
              description: 'User ID must be a valid MongoDB ObjectId',
            },
            name: {
              bsonType: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Name must be 2-50 alphabetic characters with no special symbols',
            },
            email: {
              bsonType: 'string',
              pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
              description: 'Invalid email format. Must follow example@domain.com format',
            },
            password: {
              bsonType: 'string',
              minLength: 8,
              pattern: '^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$',
              description:
                'Password must contain: 8+ characters, 1 uppercase, 1 lowercase, 1 number, 1 special character',
            },
            rootDirId: {
              bsonType: 'objectId',
              description: 'Root directory ID must be a valid MongoDB ObjectId',
            },
            pictureUrl: {
              bsonType: 'string',
            },
            provider: {
              bsonType: ['null', 'string'],
              description: 'Can be null or a string',
            },
            providerId: {
              bsonType: ['null', 'string'],
              description: 'Can be null or a string',
            },
            role: {
              bsonType: 'string',
              enum: ['Admin', 'Manager', 'User', 'Owner'],
              description: 'Must be one of: "Admin", "Manager", or "User".',
            },
            storageLimit: {
              bsonType: 'double',
              description: 'Maximum storage allowed for the user in bytes.',
            },

            isDeleted: {
              bsonType: 'bool',
              description: 'Soft‑delete flag (false = active, true = deleted)',
            },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
            __v: {
              bsonType: 'int',
            },
          },
          additionalProperties: false,
        },
      },
      validationAction: 'error',
      validationLevel: 'strict',
    },
    {
      [command]: 'directories',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            '_id',
            'name',
            'parentDirId',
            'userId',
            'updatedAt',
            'createdAt',
            'size',
            'path',
          ],
          properties: {
            _id: {
              bsonType: 'objectId',
              description: 'User ID must be a valid MongoDB ObjectId',
            },
            name: {
              bsonType: 'string',
              description: 'File size is too large',
            },
            size: {
              bsonType: 'int',
              description: 'File size is too large',
            },
            parentDirId: {
              bsonType: ['null', 'objectId'],
              description: 'parent directory ID must be a valid MongoDB ObjectId',
            },
            userId: {
              bsonType: 'objectId',
              description: 'user ID must be a valid MongoDB ObjectId',
            },
            path: {
              bsonType: 'array',
              items: {
                bsonType: 'objectId',
              },
            },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
            __v: {
              bsonType: 'int',
            },
          },
          additionalProperties: false,
        },
      },
      validationAction: 'error',
      validationLevel: 'strict',
    },
    {
      [command]: 'files',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: [
            '_id',
            'extension',
            'name',
            'parentDirId',
            'size',
            'userId',
            'createdAt',
            'updatedAt',
            'isUploading',
          ],
          properties: {
            _id: {
              bsonType: 'objectId',
              description: 'User ID must be a valid MongoDB ObjectId',
            },
            extension: {
              bsonType: 'string',
              description: 'file extension must be a valid extension',
            },
            name: {
              bsonType: 'string',
            },
            size: {
              bsonType: 'int',
              description: 'File size is too large',
            },
            parentDirId: {
              bsonType: 'objectId',
              description: 'parent directory ID must be a valid MongoDB ObjectId',
            },
            userId: {
              bsonType: 'objectId',
              description: 'user ID must be a valid MongoDB ObjectId',
            },
            isUploading: {
              bsonType: 'bool',
              description: 'isUploading filed must be of boolean type',
            },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
            __v: {
              bsonType: 'int',
            },
          },
          additionalProperties: false,
        },
      },
      validationAction: 'error',
      validationLevel: 'strict',
    },
  ];

  await Promise.all(dbSchema.map((schema) => db.command(schema)));
} catch (error) {
  console.log('Error setting up the database', error);
} finally {
  await client.close();
}
