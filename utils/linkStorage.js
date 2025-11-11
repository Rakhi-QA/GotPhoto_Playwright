import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');

export function saveGeneratedLink(checkoutUrl, jobName, jobId) {
  const content = `GENERATED_JOB_URL=${checkoutUrl}\nJOB_NAME=${jobName}\nNEXTGEN_JOB_ID=${jobId}`;
  fs.writeFileSync(envPath, content);
  console.log(`💾 Saved job link, job name, and job ID to .env`);
}

export function getGeneratedLink() {
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/GENERATED_JOB_URL=(.*)/);
  return match ? match[1].trim() : null;
}

export function getJobName() {
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/JOB_NAME=(.*)/);
  return match ? match[1].trim() : null;
}

export function getJobId() {
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = content.match(/NEXTGEN_JOB_ID=(.*)/);
  return match ? match[1].trim() : null;
}
