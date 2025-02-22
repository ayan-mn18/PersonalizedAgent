import { createServer } from './server';
// import { db } from './db';

async function bootstrap() {
	try {
		const app = await createServer();
		// console.log(process.env.DATABASE_URL)

		app.listen(3003, async () => {
			console.log('\n');
			console.log(
				`Server running on port ${3003} - http://localhost:${3003}/api\n`
			);
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

bootstrap();





