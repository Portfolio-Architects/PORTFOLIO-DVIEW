const { isSameApartment, normalizeAptName } = require('../src/lib/utils/apartmentMapping');

const name1 = "동탄 레이크 자연앤푸르지오"; // from FULL_DONG_DATA
const name2 = "동탄레이크 자연앤푸르지오"; // from URL hash

console.log('normalizeAptName(name1):', normalizeAptName(name1));
console.log('normalizeAptName(name2):', normalizeAptName(name2));
console.log('isSameApartment(name1, name2):', isSameApartment(name1, name2));
