import { generateAgoraToken } from '../lib/token';
import { createClient } from 'redis';
import {
	VITE_REDIS_PASSWORD,
	VITE_REDIS_HOST,
	VITE_REDIS_PORT,
	VITE_TOKEN_EXPIRATION_SECONDS
} from '$env/static/private';

const expires =
	!Number(VITE_TOKEN_EXPIRATION_SECONDS) || isNaN(Number(VITE_TOKEN_EXPIRATION_SECONDS))
		? 3600
		: Number(VITE_TOKEN_EXPIRATION_SECONDS);
export const prerender = true;

const client = createClient({
	password: VITE_REDIS_PASSWORD,
	socket: {
		host: VITE_REDIS_HOST,
		port: Number(VITE_REDIS_PORT)
	}
});

export async function load() {
	let token: ReturnType<typeof generateAgoraToken>;
	await client.connect();
	const savedToken = await client.get('token');
	if (savedToken) {
		token = JSON.parse(savedToken);
		console.log('restored token', token);
	} else {
		token = generateAgoraToken('demo-channel', false);
		console.log('creating token', token);
		await client.set('token', JSON.stringify(token), { EX: expires });
	}
	await client.disconnect();

	const data = {
		token,
		id: Date.now()
	} as const;
	return data;
}
