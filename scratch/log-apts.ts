import { APARTMENTS_BY_DONG } from '../frontend/src/lib/apartment-data';
const apts = Object.values(APARTMENTS_BY_DONG).flat();
const unam = apts.filter(a => a.name.includes('우남퍼스트빌'));
const thesharp = apts.filter(a => a.name.includes('더샵 센트럴시티'));
console.log('Unam:', unam);
console.log('TheSharp:', thesharp);
