import { constants } from 'fs';
import { access, mkdir, writeFile } from 'fs/promises';

import type { Embed } from '../../api/api';
import { getEmbeds } from '../../api/api';
import { getSchedule } from '../scraper';

async function ensureDir(path: string) {
	try {
		await access(path, constants.F_OK);
	} catch {
		await mkdir(path, { recursive: true });
	}
}

async function main(): Promise<void> {
	const periods = ['today', 'week', 'month', 'next'] as const;
	const dataDir = './data';

	await ensureDir(dataDir);

	await Promise.all(
		periods.map(async (period) => {
			try {
				const schedule = await getSchedule(period);

				const filePath = `${dataDir}/${period}.json`;

				if (!schedule) {
					console.warn(`⚠️ Não há eventos para ${period}.`);
					const syntheticEmbed: Embed = { unavailable: true };
					await writeFile(
						filePath,
						JSON.stringify([syntheticEmbed], null, 2),
						'utf-8'
					);
					return;
				}

				const embeds = getEmbeds(period, schedule);
				await writeFile(filePath, JSON.stringify(embeds, null, 2), 'utf-8');

				console.log(`✅ Guardado ${filePath}`);
			} catch (err) {
				console.error(`❌ Falhou para ${period}:`, err);
			}
		})
	);
}

void main().catch((error) => {
	console.error('❌ Reminder processing failed:', error);
	process.exit(1);
});
