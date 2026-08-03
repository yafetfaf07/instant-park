import { PrismaClient, Gender, ParkingAvenueType, PARKINGSTATUS, SUBCITY, Reservation, ReportCategory } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding started...");
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('password123', saltRounds);

  // 1. Create Prerequisite Data
  const customer = await seedCustomer();
  const owner = await seedOwner(hashedPassword);

  const offStreetAvenue = await seedParkingAvenue(owner.id, 'OFF_STREET');
  const onStreetAvenue = await seedParkingAvenue(owner.id, 'ON_STREET');
  const avenues = [offStreetAvenue, onStreetAvenue];

    // 2. Add Images for these Avenues
  await seedParkingAvenueImages(avenues);


   const customers = await prisma.customer.findMany();
    await seedVehicles(1, customers);

    const warden1 = await seedWarden(owner.id, offStreetAvenue.id);
    const warden2 = await seedWarden(owner.id, onStreetAvenue.id);
// const customers = await prisma.customer.findMany();
  const wardens = await prisma.warden.findMany();
//   const avenues = await prisma.parkingAvenue.findMany();



  // 3. Fetch all entities to build relationship lists

  // 2. Create Transactional/Relational Data
  const reservations = await seedReservations(10000, [customer], avenues);
  for (const avenue of avenues) {
    await seedOccupancyLogs(avenue.id, 5000); // 5000 logs for each
    }
//   await seedOccupancyLogs(avenue.id, 10000);
  await seedCheckIns(10000, [customer], avenues, reservations);
  await seedIncidentReports(10000, customers, wardens, avenues);


  console.log("Seeding finished successfully!");
}

async function seedCustomer() {
  return await prisma.customer.create({
    data: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      username: `user_${faker.string.alphanumeric(5)}`,
      phoneNo: faker.phone.number({ style: 'international' }),
      gender: 'MALE',
      location: 'Addis Ababa',
    }
  });
}

async function seedOwner(password: string) {
  return await prisma.parkingAvenueOwner.create({
    data: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      username: faker.internet.userName(),
      password: password,
      phoneNo: faker.phone.number({ style: 'international' }),
      email: faker.internet.email(),
      personalId: faker.string.uuid(),
    }
  });
}


async function seedParkingAvenue(ownerId: string, type: ParkingAvenueType) {
  const latitude = faker.location.latitude({ min: 8.85, max: 9.15, precision: 6 });
  const longitude = faker.location.longitude({ min: 38.65, max: 38.95, precision: 6 });

  // For ON_STREET, we calculate a point 20m away (~0.00018 degrees)
  const isStreet = type === 'ON_STREET';
  const endLatitude = isStreet ? latitude + 0.00018 : null;
  const endLongitude = isStreet ? longitude + 0.00018 : null;

  return await prisma.parkingAvenue.create({
    data: {
      name: `${faker.company.name()} ${type === 'ON_STREET' ? 'Street' : 'Off-Street'} Parking`,
      address: faker.location.streetAddress(),
      latitude,
      longitude,
      endLatitude,
      endLongitude,
      ownerId: ownerId,
      workingHrs: '08:00-20:00',
      hourlyRate: 50,
      totalSpots: 100,
      currentSpots: 80,
      status: 'OPEN',
      type: type,
      legalDoc: 'doc_url.pdf',
      subCity: 'BOLE'
    }
  });
}

async function seedReservations(count: number, users: any[], avenues: any[]) {
  const created: Reservation[] = []; 
  for (let i = 0; i < count; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const avenue = avenues[Math.floor(Math.random() * avenues.length)];
    const startTime = faker.date.recent();
    
    try {
      const res = await prisma.reservation.create({
        data: {
          bookingRef: `BK-${faker.string.alphanumeric(8).toUpperCase()}`,
          startTime: startTime,
          endTime: new Date(startTime.getTime() + 2 * 60 * 60 * 1000),
          durationHours: 2,
          totalPrice: 100,
          plateNumber: `${faker.string.alphanumeric(3).toUpperCase()}-${faker.number.int({min: 1000, max: 9999})}`,
          userId: user.id,
          parkingAvenueId: avenue.id,
        }
      });
      created.push(res);
    } catch (e) { /* Skip duplicates */ }
  }
  return created;
}


// async function seedCheckIns(count: number, users: any[], avenues: any[], reservations: any[]) {
//   console.log("Seeding Check-Ins...");

//   for (let i = 0; i < count; i++) {
//     const isWalkIn = Math.random() > 0.4; // 60% chance it's a walk-in, 40% reservation
    
//     try {
//       if (!isWalkIn && reservations[i]) {
//         // SCENARIO 1: Existing Reservation
//         const res = reservations[i];
//         await prisma.checkIn.create({
//           data: {
//             licensePlate: res.plateNumber,
//             parkingAvenueId: res.parkingAvenueId,
//             userId: res.userId,
//             reservationId: res.id,
//             status: "COMPLETED",
//             calculatedAmount: res.totalPrice,
//           }
//         });
//       } else {
//         // SCENARIO 2: Walk-in (Randomly pick a user and an avenue)
//         const randomUser = users[Math.floor(Math.random() * users.length)];
//         const randomAvenue = avenues[Math.floor(Math.random() * avenues.length)];
        
//         await prisma.checkIn.create({
//           data: {
//             licensePlate: `${faker.string.alphanumeric(3).toUpperCase()}-${faker.number.int({ min: 1000, max: 9999 })}`,
//             parkingAvenueId: randomAvenue.id,
//             userId: randomUser.id,
//             reservationId: null, // No reservation for walk-ins
//             status: "COMPLETED",
//             calculatedAmount: faker.number.int({ min: 50, max: 200 }),
//           }
//         });
//       }
//     } catch (e) {
//       // Catch unique constraint errors (e.g., duplicate license plates)
//     }
//   }
// }

async function seedCheckIns(count: number, users: any[], avenues: any[], reservations: any[]) {
    console.log(`Seeding ${count} check-ins...`);
    let successCount = 0;

    // Use a Set to keep track of used reservations since CheckIn.reservationId is UNIQUE
    const usedReservationIds = new Set();
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < count; i++) {
        const randomAvenue = avenues[Math.floor(Math.random() * avenues.length)];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        
        // 1. Determine if this is a Reservation or Walk-in
        const isReservation = Math.random() > 0.5 && reservations.length > 0;
        
        // --- FIX: DECLARE THE VARIABLE HERE ---
        let reservationId: string | null = null;
        let licensePlate: string;

        if (isReservation) {
            // Find a reservation that hasn't been used yet
            const availableReservations = reservations.filter(r => !usedReservationIds.has(r.id));
            
            if (availableReservations.length > 0) {
                const res = availableReservations[Math.floor(Math.random() * availableReservations.length)];
                reservationId = res.id;
                licensePlate = res.plateNumber; 
                usedReservationIds.add(res.id);
            } else {
                // Fallback to walk-in if all reservations are used
                licensePlate = `WALK-${faker.string.alphanumeric(7).toUpperCase()}`;
            }
        } else {
            // Walk-in logic
            licensePlate = `WALK-${faker.string.alphanumeric(7).toUpperCase()}`;
        }

        // 2. Generate a date within the CURRENT year so your chart isn't empty
        const randomDate = faker.date.between({ 
            from: `${currentYear}-01-01T00:00:00Z`, 
            to: `${currentYear}-12-31T23:59:59Z` 
        });

        try {
            await prisma.checkIn.create({
                data: {
                    licensePlate: licensePlate,
                    parkingAvenueId: randomAvenue.id,
                    userId: randomUser.id,
                    reservationId: reservationId, // Now correctly defined
                    status: "COMPLETED", // Force COMPLETED so it shows in revenue trends
                    calculatedAmount: faker.number.float({ min: 20, max: 200, fractionDigits: 2 }),
                    checkoutTxRef: faker.string.uuid(),
                    createdAt: randomDate,
                    updatedAt: randomDate
                }
            });
            successCount++;
        } catch (error) {
            // console.error("Check-in failed:", error.message);
        }
    }
    console.log(`Successfully seeded ${successCount} check-ins.`);
}

async function seedOccupancyLogs(avenueId: string, count: number) {
  const logs = Array.from({ length: count }).map(() => ({
    parkingAvenueId: avenueId,
    hour: faker.number.int({ min: 0, max: 23 }),
    dayOfWeek: faker.number.int({ min: 0, max: 6 }),
    isWeekend: Math.random() > 0.7 ? 1 : 0,
    totalSpots: 100,
    currentSpots: faker.number.int({ min: 0, max: 100 }),
    occupancyRate: Math.random(),
    timestamp: faker.date.recent(),
  }));
  await prisma.occupancyLog.createMany({ data: logs });
}

// Warden is created by an Owner for a specific Parking Avenue
async function seedWarden(ownerId: string, avenueId: string) {
  return await prisma.warden.create({
    data: {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      username: `warden_${faker.string.alphanumeric(5)}`,
      phoneNo: faker.phone.number({ style: 'international' }),
      gender: 'MALE',
      residenceArea: 'Addis Ababa',
      parkingAvenueId: avenueId, // Linked to the avenue
      wardenStatus: 'OFFDUTY',
    }
  });
}


async function seedIncidentReports(count: number, customers: any[], wardens: any[], avenues: any[]) {
  const categories = Object.values(ReportCategory);

  for (let i = 0; i < count; i++) {
    const randomAvenue = avenues[Math.floor(Math.random() * avenues.length)];
    const isCustomerReport = Math.random() > 0.5;

    let customerId = null;
    let wardenId = null;

    if (isCustomerReport && customers.length > 0) {
      customerId = customers[Math.floor(Math.random() * customers.length)].id;
    } else if (wardens.length > 0) {
      wardenId = wardens[Math.floor(Math.random() * wardens.length)].id;
    }

    if (!customerId && !wardenId) continue;

    await prisma.incidentReport.create({
      data: {
        category: categories[Math.floor(Math.random() * categories.length)],
        reason: faker.lorem.sentence(),
        parkingAvenueId: randomAvenue.id,
        customerId,
        wardenId,
        createdAt: faker.date.recent(),
      },
    });
  }
}

async function seedVehicles(countPerCustomer: number, customers: any[]) {
  console.log("Seeding Vehicles...");
  
  for (const customer of customers) {
    for (let i = 0; i < countPerCustomer; i++) {
      try {
        await prisma.vehicle.create({
          data: {
            licensePlate: `${faker.string.alphanumeric(3).toUpperCase()}-${faker.number.int({ min: 1000, max: 9999 })}`,
            ownerId: customer.id,
          }
        });
      } catch (e) {
        // Silently skip if we generate a duplicate license plate for this specific customer
        // or if the unique constraint is hit.
      }
    }
  }
  console.log("Vehicle seeding finished.");
}

async function seedParkingAvenueImages(avenues: any[]) {
  console.log("Seeding Parking Avenue Images...");

  const mockImageUrls = [
    "C:\\Users\\Hiwot Getachew\\Downloads\\parking avenue 1.jpg", 
    "C:\\Users\\Hiwot Getachew\\Downloads\\pakrkingavenue2.jpg", 
  ];

//   const mockImageUrls = [
//   String.raw`C:\Users\Hiwot Getachew\Downloads\parking avenue 1.jpg`, 
//   String.raw`C:\Users\Hiwot Getachew\Downloads\pakrkingavenue2.jpg`, 
// ];

  for (const avenue of avenues) {
    // Add 3 images for each avenue
    for (const url of mockImageUrls) {
      await prisma.parkingAvenueImage.create({
        data: {
          parkingAvenueId: avenue.id,
          photosUrl: url,
        },
      });
    }
  }
  console.log("Parking Avenue Images seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());