import {stat,readFile} from 'node:fs/promises';
import {validSchedule} from '../lib/security.ts';
const path=process.argv[2];
if(!path||!(await stat(path)).isFile()||(await stat(path)).size>2000000)throw Error('Invalid snapshot file');
if(!validSchedule(JSON.parse(await readFile(path,'utf8'))))throw Error('Invalid schedule snapshot');
console.log('Schedule schema and destinations validated');
