import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { router } from './routes';
import dotenv from 'dotenv';

dotenv.config();


export async function createServer() {
	const app = express();

	// Security
	app.use(helmet());

	// CORS
	app.use(
		cors({
			origin: [`${process.env.CLIENT_URL}`], // Allow frontend urls
			credentials: true, // Required for cookies/auth headers
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization'],
		})
	);

	// Body parser
	app.use(express.json());

	
	const serverChecks = async (
		req: Request,
		res: Response,
		next: NextFunction
	) => {
		console.log('Running server checks...');
		// Add server checks here
		// e.g. check if database connection is established

		console.log('Server checks passed!');
		next();
	};

	// Health Check Enpoint
	app.get('/admin', serverChecks, async (req, res) => {
		res.send({
			status: 200,
			message: 'Server is up and running with all checks passed!',
		});
	});

	// setup request logging
	app.use(morgan('dev'));

	// Configure routes
	app.use('/api', router);

	// Graceful shutdown
	const cleanup = async () => {
		console.log('Shutting down...');
		process.exit(0);
	};

	process.on('SIGINT', cleanup);
	process.on('SIGTERM', cleanup);

	return app;
}





