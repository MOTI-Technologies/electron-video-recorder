import { generateAgoraToken } from '../lib/token';
import { createClient } from 'redis';
import {
	REDIS_PASSWORD,
	REDIS_HOST,
	REDIS_PORT,
	TOKEN_EXPIRATION_SECONDS
} from '$env/static/private';

const expires =
	!Number(TOKEN_EXPIRATION_SECONDS) || isNaN(Number(TOKEN_EXPIRATION_SECONDS))
		? 3600
		: Number(TOKEN_EXPIRATION_SECONDS);

export const ssr = true;
export const prerender = false;

const client = createClient({
	password: REDIS_PASSWORD,
	socket: {
		host: REDIS_HOST,
		port: Number(REDIS_PORT)
	}
});

console.log('------- REDIS CONFIG -------', { REDIS_PASSWORD, REDIS_HOST, REDIS_PORT, TOKEN_EXPIRATION_SECONDS });

export async function load() {
	let token: ReturnType<typeof generateAgoraToken>;
	console.log('setup client')
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
