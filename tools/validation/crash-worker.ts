import { openDatabase } from '../../electron/infrastructure/database.ts';
import { Application } from '../../electron/application.ts';
const [path, mode, payload] = process.argv.slice(2),
  db = openDatabase(path);
if (mode === 'kill') {
  db.function('audit_crash', () => {
    process.kill(process.pid, 'SIGKILL');
    return 0;
  });
  db.exec(
    'CREATE TEMP TRIGGER audit_crash BEFORE INSERT ON review_receipts BEGIN SELECT audit_crash(); END;',
  );
}
const app = new Application({ db, dataDir: path, now: () => new Date('2026-10-16T08:00:00Z') });
console.log(JSON.stringify(app.handle('review.submit', JSON.parse(payload))));
db.close();
