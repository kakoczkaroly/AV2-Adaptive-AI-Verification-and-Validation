import {cli} from './helix.mjs';
try { process.exitCode=await cli(process.argv.slice(2)); }
catch(error) {console.error(String(error));process.exitCode=1;}
