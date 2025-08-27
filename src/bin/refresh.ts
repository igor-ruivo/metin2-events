import { constants } from 'fs';
import { access, mkdir, writeFile } from 'fs/promises';

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

				if (!schedule) {
					console.warn(`⚠️ Não há eventos para ${period}.`);
					return;
				}

				const embeds = getEmbeds(period, schedule);

				const filePath = `${dataDir}/${period}.json`;
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
