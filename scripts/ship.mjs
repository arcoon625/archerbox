import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
function run(command, args, capture = false) {
  const result = spawnSync(command, args, {cwd, encoding:'utf8', stdio:capture ? 'pipe' : 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed.${capture ? '\n' + (result.stderr || result.stdout) : ''}`);
  return result.stdout?.trim();
}
const git = (...args) => run('git', args, true);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  const branch = git('symbolic-ref','--short','HEAD');
  if (branch !== 'main') throw new Error('Switch to main before publishing. Feature branches do not publish the live site.');
  const remote = git('remote','get-url','origin');
  if (!/^https:\/\/github\.com\/arcoon625\/archerbox(?:\.git)?$|^git@github\.com:arcoon625\/archerbox(?:\.git)?$/.test(remote)) {
    throw new Error('The origin remote is not the Archerbox GitHub repository. Nothing was published.');
  }
  run('gh',['auth','status'],true);
  run('git',['fetch','origin','main']);
  git('merge-base','--is-ancestor','origin/main','HEAD');
  git('diff','--check');
  console.log('\nChecking Archerbox before publishing…');
  run('npm',['run','check']);
  run('npm',['run','build']);
  if (git('status','--porcelain')) {
    run('git',['add','--all']);
    run('git',['commit','-m',process.argv.slice(2).join(' ').trim() || 'Update Archerbox']);
  }
  const sha = git('rev-parse','HEAD');
  run('git',['push','origin','main']);
  console.log(`\nCommit: https://github.com/arcoon625/archerbox/commit/${sha}`);
  console.log('Waiting for Cloudflare to publish this commit…');
  const deadline = Date.now() + 10 * 60_000;
  let previous = '';
  while (Date.now() < deadline) {
    const data = JSON.parse(run('gh',['api',`repos/arcoon625/archerbox/commits/${sha}/check-runs`],true));
    const build = data.check_runs.find(check => check.name === 'Workers Builds: archerbox');
    const status = build ? `${build.status}${build.conclusion ? ': ' + build.conclusion : ''}` : 'Waiting for Cloudflare to start';
    if (status !== previous) {console.log(status); previous = status;}
    if (build?.status === 'completed') {
      if (build.conclusion !== 'success') throw new Error(`Cloudflare did not deploy successfully. Check ${build.details_url}`);
      const response = await fetch('https://archer-box.com', {signal:AbortSignal.timeout(20_000)});
      if (!response.ok || !(await response.text()).includes('Archerbox')) throw new Error('Cloudflare reported success, but the website check failed. Check https://archer-box.com.');
      console.log('\nPublished successfully: https://archer-box.com');
      console.log(`Deployment details: ${build.details_url}`);
      process.exit(0);
    }
    await pause(5000);
  }
  throw new Error('The push succeeded, but deployment has not finished after 10 minutes. Check Cloudflare Builds before calling the update live.');
} catch (error) {
  console.error('\nPublishing stopped:',error.message);
  console.error('If GitHub has newer changes, bring them into this checkout before trying again.');
  process.exitCode = 1;
}
