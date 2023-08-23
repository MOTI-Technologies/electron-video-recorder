import agoraTokenPackage from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = agoraTokenPackage;
import { randomBytes } from 'crypto';

import { VITE_AGORA_APP_ID, VITE_AGORA_PRIMARY_CERT, VITE_TOKEN_EXPIRATION_SECONDS } from '$env/static/private';
export interface AgoraTokenResult {
	token: string;
	channel: string;
	key?: string;
	salt?: string;
}

const expirationTimeInSeconds =
	!Number(VITE_TOKEN_EXPIRATION_SECONDS) || isNaN(Number(VITE_TOKEN_EXPIRATION_SECONDS))
		? 3600
		: Number(VITE_TOKEN_EXPIRATION_SECONDS);

export function generateAgoraToken(channel: string, useEncryption = false): AgoraTokenResult {
	const encryptionKey = randomBytes(32).toString('hex');
	const encryptionSaltBase64 = randomBytes(32).toString('base64');

	const now = Date.now();

	const currentTimestamp = Math.floor(now / 1000);
	const expires = currentTimestamp + expirationTimeInSeconds;
	const appID = VITE_AGORA_APP_ID;
	const appCertificate = VITE_AGORA_PRIMARY_CERT;

	const token = RtcTokenBuilder.buildTokenWithUid(
		appID,
		appCertificate,
		channel,
		0,
		RtcRole.PUBLISHER,
		expires
	);
	if (useEncryption) {
		return { token, channel, key: encryptionKey, salt: encryptionSaltBase64 };
	} else {
		return { token, channel };
	}
}
