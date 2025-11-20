import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import directoryRoutes from './routes/directoryRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import rzpSubscriptionRoutes from './routes/subscriptionRoutes.js';
import checkAuth from './middlewares/authMiddleware.js';
import { connectDB } from './config/db.js';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { throttle } from './middlewares/throttleMiddleware.js';
import webhookRoutes from './routes/webhookRoutes.js';

/* Connecting with mongodb */
await connectDB();

const app = express();

/* .env */
const Secret_Key = process.env.SECRET_KEY;
const PORT = process.env.PORT || 4000;
const Client_Url = process.env.CLIENT_URL;

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        reportUri: '/csp-violation-report',
      },
    },
  })
);
app.use(cookieParser(Secret_Key));
app.use(express.json());

app.use(
  cors({
    origin: Client_Url,
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 45,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  statusCode: 429,
  message: 'Too many request,Please wait',
});

//app.use(limiter, throttle(2000, 1));

/* Attach DB with Each Request: */
// app.use((req, res, next) => {
//   console.log(req.url);
//   req.db = db;
//   next();
// });

app.get('/', (req, res) => {
  return res.status(200).json({ message: 'Hello, from storage app' });
});

/* Testing End Point: */
app.get('/error', (req, res) => {
  console.log('process exist with error');
  process.exit(1);
});

app.use('/directory', checkAuth, directoryRoutes); // checkAuth is route specific middleware directory or /file
app.use('/file', checkAuth, fileRoutes); // checkAuth is route specific middleware directory or /file
app.use(userRoutes);
app.use('/subscriptions', checkAuth, rzpSubscriptionRoutes);
app.use('/auth', authRoutes);
app.use('/webhooks', webhookRoutes);

app.post(
  '/csp-violation-report',
  express.json({ type: 'application/csp-violation-report' }),
  (req, res, next) => {
    console.log(req.body);
    return res.json({ error: 'csp violation' });
  }
);

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: 'Something went wrong!' });
});

const server = app.listen(PORT, () => {
  console.log(`server is listening on address http://localhost:${PORT}`);
});
