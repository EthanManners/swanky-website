const fs = require("fs");
const path = require("path");
const prisma = require("../db/client");

async function main(){
  const filePath = path.join(__dirname, "plots.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  const plots = JSON.parse(raw);

  for(const plot of plots){
    await prisma.plot.upsert({
      where: { plot_id: plot.plot_id },
      update: {
        price_cents: plot.price_cents,
        area_m2: plot.area_m2,
        district: plot.district || null
      },
      create: {
        plot_id: plot.plot_id,
        price_cents: plot.price_cents,
        area_m2: plot.area_m2,
        district: plot.district || null,
        status: "available"
      }
    });
  }

  console.log(`Seeded ${plots.length} plots.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
