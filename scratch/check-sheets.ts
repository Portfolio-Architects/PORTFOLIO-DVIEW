import { fetchSheetApartmentsByDong } from '../frontend/src/lib/services/googleSheets';
import { adminDb } from '../frontend/src/lib/firebaseAdmin'; // we need to mock this?

async function run() {
  const data = await fetchSheetApartmentsByDong();
  
  const apts = Object.values(data.byDong).flat();
  const unam = apts.find(a => a.name.includes('우남퍼스트빌') && a.dong === '청계동');
  const thesharp = apts.find(a => a.name.includes('더샵 센트럴시티') && a.dong === '청계동');
  
  console.log('Unam:', unam?.name, unam?.householdCount);
  console.log('TheSharp:', thesharp?.name, thesharp?.householdCount);
}
run();
