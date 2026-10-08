import { createService } from '../lib/clinica-estetica/service.mjs';
const results=await createService().processPending();
console.log(JSON.stringify(results.map(r=>r.status==='fulfilled'?r.value:{status:'failed'})));
