import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(configDirectory, '../../.env') });

export const {
	NODE_ENV,
	LOG_FORMAT,
	LOG_DIR,
	JWT_SECRET,
	EXPIRY_TIME,
	SMS_AUTH_KEY,
	DLT_ENTITY_ID,
	WAPP_APP_ID,
	WAPP_VERSION,
	WAPP_PHONE_NUMBER_ID,
	WAPP_ACCESS_TOKEN,
} = process.env;

export const PORT = Number.parseInt(process.env.PORT, 10) || 5000;