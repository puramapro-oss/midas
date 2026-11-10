// Test-only native fixture. The environment permits loopback TCP but denies
// Unix sockets; use a private, random-password cluster, never an external URL.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { createRequire } from 'node:module';
import { randomBytes, createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
export async function withPrivatePostgres(action, { evidencePath, runtimeDirectory }) {
  assert(process.getuid() !== 0, 'Unprivileged test identity required');
  assert(!Object.keys(process.env).some(k=>k.startsWith('PG') || k==='NODE_PG_FORCE_NATIVE'),
    'External PostgreSQL environment is not permitted in this fixture');
  const require = createRequire(path.join(runtimeDirectory, 'package.json'));
  const pg = require('pg');
  const bin = path.join(runtimeDirectory,'node_modules/@embedded-postgres/linux-x64/native/bin');
  const runtime = { startedAt:new Date().toISOString(), bind:'127.0.0.1', unixSockets:false,
    syntheticCredentials:true, started:false, stopped:false, removed:false, commands:[],
    binaries:Object.fromEntries(['postgres','initdb','pg_ctl'].map(name=>[name,
      createHash('sha256').update(fs.readFileSync(path.join(bin,name))).digest('hex')])) };
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'purama-shared-risk-'));
  fs.chmodSync(directory,0o700);
  const data=path.join(directory,'data'); const log=path.join(directory,'server.log');
  const passwordFile=path.join(directory,'password');
  const password=randomBytes(32).toString('hex');
  let failure; let result;
  const command=async(name,args)=>{
    runtime.commands.push({name,args:args.map(a=>a===passwordFile?'[temporary password file]':a)});
    return exec(path.join(bin,name),args,{cwd:directory,timeout:25000,maxBuffer:1024*1024,
      env:{PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C',TZ:'UTC'}});
  };
  try {
    runtime.version=(await command('postgres',['--version'])).stdout.trim();
    const port=await new Promise((resolve,reject)=>{
      const server=net.createServer(); server.on('error',reject);
      server.listen(0,'127.0.0.1',()=>{ const p=server.address().port; server.close(e=>e?reject(e):resolve(p)); });
    });
    fs.writeFileSync(passwordFile,password+'\n',{mode:0o600,flag:'wx'});
    await command('initdb',['-D',data,'--username=shared_risk_fixture','--auth-local=reject',
      '--auth-host=scram-sha-256','--pwfile='+passwordFile,'--no-locale','--encoding=UTF8',
      '-c','max_connections=30','-c','shared_buffers=16MB','-c','dynamic_shared_memory_type=mmap']);
    fs.unlinkSync(passwordFile);
    fs.appendFileSync(path.join(data,'postgresql.conf'),[
      '',"listen_addresses='127.0.0.1'","unix_socket_directories=''",`port=${port}`,
      'fsync=on','synchronous_commit=on','full_page_writes=on',"max_wal_size='64MB'","min_wal_size='32MB'",'',
    ].join('\n'));
    await command('pg_ctl',['-D',data,'-l',log,'-w','-t','15','start']);
    runtime.started=true;
    const connection=Object.freeze({host:'127.0.0.1',port,user:'shared_risk_fixture',database:'postgres',
      password,ssl:false,connectionTimeoutMillis:25000,query_timeout:30000,
      options:'-c statement_timeout=10000 -c lock_timeout=5000 -c idle_in_transaction_session_timeout=15000',
      application_name:'purama_shared_risk_fixture'});
    const probe=new pg.Client(connection);
    try {
      await probe.connect();
      runtime.settings=(await probe.query(`SELECT version(), current_setting('listen_addresses') AS listen_addresses,
        current_setting('unix_socket_directories') AS unix_socket_directories, current_setting('fsync') AS fsync,
        current_setting('synchronous_commit') AS synchronous_commit, current_setting('full_page_writes') AS full_page_writes`)).rows[0];
      assert.equal(runtime.settings.listen_addresses,'127.0.0.1'); assert.equal(runtime.settings.unix_socket_directories,'');
      assert.equal(runtime.settings.fsync,'on'); assert.equal(runtime.settings.synchronous_commit,'on');
      assert.equal(runtime.settings.full_page_writes,'on');
    } finally { await probe.end(); }
    result=await action({pg,connection,dataDirectory:data});
  } catch(error) { failure=error; }
  finally {
    try {
      if(fs.existsSync(path.join(data,'postmaster.pid'))) await command('pg_ctl',['-D',data,'-m','fast','-w','-t','15','stop']);
      runtime.stopped=!fs.existsSync(path.join(data,'postmaster.pid'));
      if(fs.existsSync(log)) runtime.serverLog=fs.readFileSync(log,'utf8');
      if(runtime.stopped) { fs.rmSync(directory,{recursive:true}); runtime.removed=!fs.existsSync(directory); }
    } catch(error) { failure=failure?new AggregateError([failure,error]):error; }
    runtime.finishedAt=new Date().toISOString();
    fs.writeFileSync(evidencePath,JSON.stringify({status:failure?'FAIL':'PASS',runtime,result,
      failure:failure?.message??null},null,2)+'\n');
  }
  if(failure) throw failure;
  return result;
}
