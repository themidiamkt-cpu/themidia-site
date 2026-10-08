export const cidades = ['Campinas','Hortolândia','Sumaré','Americana','Indaiatuba','Valinhos','Vinhedo','Paulínia','Outra'];
export const options = {
 profissionais: [['solo','Só eu'],['2-4','2 a 4'],['5+','5 ou mais']],
 ticket: [['ate-250','Até R$ 250'],['250-400','R$ 250 a R$ 400'],['400-800','R$ 400 a R$ 800'],['acima-800','Acima de R$ 800']],
 anuncios: [['sim','Sim'],['nao','Não'],['parei','Já investi e parei']],
 verba: [['ate-1500','Até R$ 1.500'],['1500-3000','R$ 1.500 a R$ 3.000'],['acima-3000','Mais de R$ 3.000']],
 atendimento: [['recepcionista','Sim, recepcionista'],['proprio','Sou eu mesma'],['ninguem','Não']]
};
const ddds = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
export function phoneDigits(value) { const digits = String(value || '').replace(/\D/g,''); return digits.length === 13 && digits.startsWith('55') ? digits.slice(2) : digits; }
export function validPhone(value) { const v = phoneDigits(value); return v.length === 11 && ddds.has(v.slice(0,2)) && /^9\d{8}$/.test(v.slice(2)) && !/^(\d)\1{8}$/.test(v.slice(2)); }
export function formatPhone(value) { const v = phoneDigits(value).slice(0,11); if (!v) return ''; if(v.length < 3)return '('+v; return '('+v.slice(0,2)+') '+v.slice(2,7)+(v.length>7?'-'+v.slice(7):''); }
export function validInstagram(value) { const v = String(value||'').replace(/^@/,''); return /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9_.]{1,30}$/.test(v); }
export const privacyVersion = '2026-10-08';
