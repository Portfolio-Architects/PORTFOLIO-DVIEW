async function main() {
  const url = "http://localhost:5000/data/location-scores.json";
  console.log(`Fetching ${url}...`);
  const res = await fetch(url);
  const data = await res.json();
  
  const targetKey = "동탄역 시범 한화꿈에그린 프레스티지";
  console.log(`Checking key [${targetKey}]...`);
  if (data[targetKey]) {
    console.log("✅ Key found in actual json!");
    console.log("restaurantDensity:", data[targetKey].restaurantDensity);
    console.log("restaurantCategories:", JSON.stringify(data[targetKey].restaurantCategories, null, 2));
  } else {
    console.log("❌ Key NOT found in actual json!");
  }
}

main().catch(console.error);
