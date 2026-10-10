const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('1234', 10);
    const sysAdminPassword = await bcrypt.hash('Libcab#@01', 10);

    console.log('Seeding System Admin (Daniel Ofosu)...');
    await prisma.user.upsert({
        where: { email: 'danielofosu@libcab.com' },
        update: { password: sysAdminPassword, role: 'SUPER_ADMIN', name: 'Daniel Ofosu', isActive: true, forcePasswordChange: false },
        create: {
            email: 'danielofosu@libcab.com',
            password: sysAdminPassword,
            name: 'Daniel Ofosu',
            role: 'SUPER_ADMIN',
            isActive: true,
            forcePasswordChange: false,
        },
    });

    console.log('Seeding Legacy Admin...');
    await prisma.user.upsert({
        where: { email: 'admin@africab.com' },
        update: { password: adminPassword, role: 'SUPER_ADMIN', name: 'System Admin', isActive: true, forcePasswordChange: false },
        create: {
            email: 'admin@africab.com',
            password: adminPassword,
            name: 'System Admin',
            role: 'SUPER_ADMIN',
            isActive: true,
            forcePasswordChange: false,
        },
    });

    console.log('Seeding Rider...');
    await prisma.user.upsert({
        where: { email: 'rider@example.com' },
        update: { password: hashedPassword },
        create: {
            email: 'rider@example.com',
            password: hashedPassword,
            name: 'Rider One',
            role: 'RIDER',
        },
    });

    // Seed Drivers with hardware IMEI anchors, license plates, and live coordinates across Monrovia
    const drivers = [
        {
            email: 'driver@example.com',
            name: 'Emmanuel J. Kollie',
            phone: '0886000001',
            profile: {
                isOnline: true,
                vehicleType: 'Sedan',
                vehicleModel: 'Toyota Corolla (Yellow/Black)',
                vehicleColor: 'Yellow',
                licensePlate: 'LB-CAB-101',
                driverLicense: 'DL-MON-89421',
                imei: '864201048291032',
                deviceId: 'SM-G998B-SINKOR-01',
                currentLat: 6.3005,
                currentLng: -10.7969, // Sinkor 12th St
                speed: 38.5,
                heading: 142.0,
                batteryLevel: 92,
                signalStrength: 95,
                rating: 4.95,
                reviewCount: 148,
                lastPing: new Date()
            }
        },
        {
            email: 'driver2@example.com',
            name: 'Sarah Doe Kamara',
            phone: '0777000002',
            profile: {
                isOnline: true,
                vehicleType: 'SUV',
                vehicleModel: 'Nissan Patrol (Black)',
                vehicleColor: 'Black',
                licensePlate: 'LB-VIP-789',
                driverLicense: 'DL-MON-55410',
                imei: '358920194820194',
                deviceId: 'IPHONE-14-CONGO-02',
                currentLat: 6.2758,
                currentLng: -10.7490, // Congo Town
                speed: 45.0,
                heading: 90.0,
                batteryLevel: 78,
                signalStrength: 88,
                rating: 4.88,
                reviewCount: 92,
                lastPing: new Date()
            }
        },
        {
            email: 'driver3@example.com',
            name: 'Michael Smith Paye',
            phone: '0888000003',
            profile: {
                isOnline: true,
                vehicleType: 'Sedan',
                vehicleModel: 'Hyundai Elantra (Silver)',
                vehicleColor: 'Silver',
                licensePlate: 'LB-CAB-555',
                driverLicense: 'DL-MON-33290',
                imei: '869102948201948',
                deviceId: 'TECNO-CAMON-PAYN-03',
                currentLat: 6.2820,
                currentLng: -10.7090, // Paynesville ELWA
                speed: 22.0,
                heading: 260.0,
                batteryLevel: 65,
                signalStrength: 72,
                rating: 4.91,
                reviewCount: 64,
                lastPing: new Date()
            }
        },
        {
            email: 'driver4@example.com',
            name: 'Joseph Weah',
            phone: '0770112233',
            profile: {
                isOnline: true,
                vehicleType: 'Tricycle',
                vehicleModel: 'TVS King Keke (Blue)',
                vehicleColor: 'Blue',
                licensePlate: 'LB-KEKE-402',
                driverLicense: 'DL-MON-71284',
                imei: '861049281049201',
                deviceId: 'INFINIX-HOT-WATERSIDE-04',
                currentLat: 6.3210,
                currentLng: -10.8030, // Waterside Downtown
                speed: 18.0,
                heading: 180.0,
                batteryLevel: 84,
                signalStrength: 90,
                rating: 4.82,
                reviewCount: 40,
                lastPing: new Date()
            }
        },
        {
            email: 'johnd@africab.com',
            name: 'John D',
            phone: '0771234567',
            password: adminPassword, // '1234'
            profile: {
                isOnline: true,
                vehicleType: 'Sedan',
                vehicleModel: 'Toyota Corolla',
                vehicleColor: 'Silver',
                licensePlate: 'LB-CAB-901',
                driverLicense: 'DL-MON-99120',
                imei: '862049182049102',
                deviceId: 'TECNO-SPARK-JD-05',
                currentLat: 6.3005,
                currentLng: -10.7969,
                speed: 30.0,
                heading: 120.0,
                batteryLevel: 95,
                signalStrength: 98,
                rating: 5.0,
                reviewCount: 12,
                lastPing: new Date()
            }
        }
    ];

    for (const d of drivers) {
        console.log(`Seeding Driver with IMEI: ${d.name} (${d.profile.imei})...`);
        await prisma.user.upsert({
            where: { email: d.email },
            update: { 
                password: d.password || hashedPassword,
                name: d.name,
                phone: d.phone,
                driverProfile: {
                    upsert: {
                        create: d.profile,
                        update: d.profile
                    }
                }
            },
            create: {
                email: d.email,
                password: d.password || hashedPassword,
                name: d.name,
                phone: d.phone,
                role: 'DRIVER',
                driverProfile: {
                    create: d.profile
                }
            },
        });
    }

    // ─── Seed Enterprise Organizations & Fleet Tracking Assets ─────────────
    console.log('Seeding Enterprise Fleet Organizations...');

    const org1 = await prisma.fleetOrganization.upsert({
        where: { code: 'ARCMITTAL-MINING-LR' },
        update: { name: 'ArcelorMittal Mining Operations' },
        create: {
            code: 'ARCMITTAL-MINING-LR',
            name: 'ArcelorMittal Mining Operations',
            category: 'MINING',
            email: 'fleet@arcelormittal.lr',
            phone: '+231 77 100 2000',
            contactPerson: 'Director of Transport Logistics',
            plan: 'ENTERPRISE',
            apiKey: 'flt_live_arc_84920491823901'
        }
    });

    const org2 = await prisma.fleetOrganization.upsert({
        where: { code: 'UNOPS-HUMANITARIAN' },
        update: { name: 'UN / NGO Field Logistics Fleet' },
        create: {
            code: 'UNOPS-HUMANITARIAN',
            name: 'UN / NGO Field Logistics Fleet',
            category: 'NGO',
            email: 'transport@unops-liberia.org',
            phone: '+231 88 555 4433',
            contactPerson: 'Regional Logistics Coordinator',
            plan: 'ENTERPRISE',
            apiKey: 'flt_live_un_93810294819023'
        }
    });

    const org3 = await prisma.fleetOrganization.upsert({
        where: { code: 'MONROVIA-EXPRESS-LOGISTICS' },
        update: { name: 'Monrovia Express Parcel & Bike Couriers' },
        create: {
            code: 'MONROVIA-EXPRESS-LOGISTICS',
            name: 'Monrovia Express Parcel & Bike Couriers',
            category: 'LOGISTICS',
            email: 'dispatch@monroviaexpress.com',
            phone: '+231 77 333 8888',
            contactPerson: 'Operations Manager',
            plan: 'PRO',
            apiKey: 'flt_live_mexpress_2940192849102'
        }
    });

    // Seed Fleet Assets for Organizations
    const fleetAssets = [
        {
            orgId: org1.id,
            name: 'Heavy Hauler Land Cruiser #04',
            assetType: 'TRUCK',
            licensePlate: 'AML-04-MIN',
            imei: '861029482910394',
            trackerModel: 'Teltonika FMB920 GPS Tracker',
            driverName: 'Varney Sherman',
            driverPhone: '+231 77 990 1122',
            status: 'IN_TRANSIT',
            currentLat: 6.3310,
            currentLng: -10.7850,
            speed: 54.2,
            heading: 45.0,
            batteryLevel: 98,
            signalStrength: 92,
            fuelLevel: 82.5,
            geofenceZone: 'Buchanan - Yekepa Corridor',
            lastPing: new Date()
        },
        {
            orgId: org1.id,
            name: 'Executive Escort SUV #01',
            assetType: 'CAR',
            licensePlate: 'AML-01-VIP',
            imei: '862910482019481',
            trackerModel: 'Teltonika FMB120 Dual SIM',
            driverName: 'David Kpoto',
            driverPhone: '+231 88 440 2211',
            status: 'ACTIVE',
            currentLat: 6.3050,
            currentLng: -10.8010,
            speed: 32.0,
            heading: 120.0,
            batteryLevel: 100,
            signalStrength: 96,
            fuelLevel: 91.0,
            geofenceZone: 'Sinkor Executive Perimeter',
            lastPing: new Date()
        },
        {
            orgId: org2.id,
            name: 'UN Aid Emergency Response Van #12',
            assetType: 'DELIVERY_VAN',
            licensePlate: 'UN-942-LR',
            imei: '359102948201942',
            trackerModel: 'Concox GT06N Pro',
            driverName: 'Sando Freeman',
            driverPhone: '+231 77 441 9922',
            status: 'IN_TRANSIT',
            currentLat: 6.2910,
            currentLng: -10.7620,
            speed: 41.0,
            heading: 195.0,
            batteryLevel: 89,
            signalStrength: 85,
            fuelLevel: 74.0,
            geofenceZone: 'Congo Town Humanitarian Hub',
            lastPing: new Date()
        },
        {
            orgId: org3.id,
            name: 'Courier Bike Rapid 01 (Yamaha)',
            assetType: 'MOTORBIKE',
            licensePlate: 'EXP-BK-101',
            imei: '869201948201938',
            trackerModel: 'Coban GPS103B',
            driverName: 'Garrison Toe',
            driverPhone: '+231 88 112 3344',
            status: 'ACTIVE',
            currentLat: 6.3140,
            currentLng: -10.8090,
            speed: 28.5,
            heading: 310.0,
            batteryLevel: 95,
            signalStrength: 98,
            fuelLevel: 88.0,
            geofenceZone: 'Central Monrovia Delivery Zone',
            lastPing: new Date()
        },
        {
            orgId: org3.id,
            name: 'Urban Cargo Delivery Keke #03',
            assetType: 'TRICYCLE',
            licensePlate: 'EXP-KK-303',
            imei: '864920194829104',
            trackerModel: 'AfriCab Fleet IoT Sensor',
            driverName: 'Prince Tamba',
            driverPhone: '+231 77 882 1199',
            status: 'IDLE',
            currentLat: 6.2840,
            currentLng: -10.7180,
            speed: 0.0,
            heading: 0.0,
            batteryLevel: 72,
            signalStrength: 80,
            fuelLevel: 65.0,
            geofenceZone: 'Paynesville Depot Hub',
            lastPing: new Date()
        }
    ];

    for (const asset of fleetAssets) {
        console.log(`Seeding Fleet Asset: ${asset.name} (IMEI: ${asset.imei})...`);
        await prisma.fleetAsset.upsert({
            where: { imei: asset.imei },
            update: asset,
            create: asset
        });
    }

    console.log('Seeding Multi-Tenant Companies, Vehicles & Hardware Trackers...');

    const comp1 = await prisma.company.upsert({
        where: { code: 'AML-MINING-OPS' },
        update: {},
        create: {
            name: 'ArcelorMittal Liberia Logistics',
            code: 'AML-MINING-OPS',
            category: 'MINING',
            email: 'fleet.logistics@arcelormittal.lr',
            phone: '+231 77 000 8822',
            contactPerson: 'Kolu Kpadeh (Fleet Director)',
            address: 'Tubman Boulevard, Congo Town, Monrovia',
            plan: 'ENTERPRISE',
            apiKey: 'lib_live_aml_corp_894210',
            status: 'ACTIVE'
        }
    });

    const comp2 = await prisma.company.upsert({
        where: { code: 'UNOPS-LR-MISSION' },
        update: {},
        create: {
            name: 'UNOPS Monrovia Mission Logistics',
            code: 'UNOPS-LR-MISSION',
            category: 'NGO',
            email: 'transport.lr@unops.org',
            phone: '+231 88 654 3210',
            contactPerson: 'David M. Cooper',
            address: 'Mamba Point Diplomatic Enclave, Monrovia',
            plan: 'GOVERNMENT',
            apiKey: 'lib_live_unops_mamba_77192',
            status: 'ACTIVE'
        }
    });

    const comp3 = await prisma.company.upsert({
        where: { code: 'MONROVIA-EXP' },
        update: {},
        create: {
            name: 'Monrovia Express Courier & Cargo',
            code: 'MONROVIA-EXP',
            category: 'LOGISTICS',
            email: 'dispatch@monroviaexpress.com',
            phone: '+231 88 123 4567',
            contactPerson: 'Fatu Massaquoi',
            address: 'Bushrod Island Commercial Zone, Monrovia',
            plan: 'PRO',
            apiKey: 'lib_live_monexp_hub_55219',
            status: 'ACTIVE'
        }
    });

    const comp4 = await prisma.company.upsert({
        where: { code: 'TOTAL-ENERGIES-LR' },
        update: {},
        create: {
            name: 'TotalEnergies Liberia Distribution',
            code: 'TOTAL-ENERGIES-LR',
            category: 'CORPORATE',
            email: 'logistics@totalenergies.lr',
            phone: '+231 77 999 1100',
            contactPerson: 'Abraham S. Teah',
            address: 'Freeport Industrial Corridor, Monrovia',
            plan: 'ENTERPRISE',
            apiKey: 'lib_live_total_dist_44102',
            status: 'ACTIVE'
        }
    });

    // Seed Geofences for companies
    await prisma.geofence.createMany({
        data: [
            {
                companyId: comp1.id,
                name: 'AML Freeport Ore Loading Terminal',
                description: 'Restricted heavy equipment mining depot',
                fenceType: 'CIRCLE',
                coordinates: JSON.stringify([6.3420, -10.7980]),
                radiusMeters: 2500,
                speedLimit: 40,
                isAlertEnabled: true
            },
            {
                companyId: comp2.id,
                name: 'UN Diplomatic & Mission Zone (Mamba Point)',
                description: 'Security monitored corridor for UN operations',
                fenceType: 'CIRCLE',
                coordinates: JSON.stringify([6.3190, -10.8140]),
                radiusMeters: 3000,
                speedLimit: 50,
                isAlertEnabled: true
            },
            {
                companyId: comp3.id,
                name: 'Greater Monrovia Delivery Hub',
                description: 'Fast urban parcel transit boundary',
                fenceType: 'CIRCLE',
                coordinates: JSON.stringify([6.3000, -10.7800]),
                radiusMeters: 12000,
                speedLimit: 70,
                isAlertEnabled: true
            }
        ]
    }).catch(() => {});

    // Seed Vehicles & Hardware Trackers
    const vehicleData = [
        {
            companyId: comp1.id,
            name: 'AML Heavy Hauler #08 (Mack Granite)',
            make: 'Mack',
            model: 'Granite Dump Truck',
            year: 2023,
            licensePlate: 'AML-TRK-08',
            vin: '1M2AX14C7PM092811',
            color: 'Safety Orange',
            vehicleType: 'TRUCK',
            status: 'IN_TRANSIT',
            driverName: 'Mohammed S. Kromah',
            driverPhone: '+231 77 650 9182',
            currentLat: 6.3420,
            currentLng: -10.7980,
            speed: 42.0,
            heading: 175.0,
            batteryLevel: 98,
            signalStrength: 94,
            fuelLevel: 82.5,
            odometerKm: 34812,
            engineRpm: 1650,
            coolantTemp: 88,
            isIgnitionOn: true,
            geofenceZone: 'AML Freeport Ore Loading Terminal',
            tracker: {
                imei: '358920104829101',
                model: 'Teltonika FMC130 (4G Heavy)',
                protocol: 'TELTONIKA',
                simCardNumber: '+231 88 901 2233',
                batteryBackupPct: 100,
                voltageInput: 24.2
            }
        },
        {
            companyId: comp1.id,
            name: 'Mining Patrol Escort #02 (Land Cruiser)',
            make: 'Toyota',
            model: 'Land Cruiser 79 Series',
            year: 2024,
            licensePlate: 'AML-LC-02',
            vin: 'JTELB71J508291048',
            color: 'White / Hi-Vis Striping',
            vehicleType: 'CAR',
            status: 'ACTIVE',
            driverName: 'Sando Freeman',
            driverPhone: '+231 88 443 2211',
            currentLat: 6.3310,
            currentLng: -10.7850,
            speed: 55.0,
            heading: 85.0,
            batteryLevel: 95,
            signalStrength: 98,
            fuelLevel: 91.0,
            odometerKm: 18200,
            engineRpm: 2100,
            coolantTemp: 84,
            isIgnitionOn: true,
            geofenceZone: 'AML Freeport Ore Loading Terminal',
            tracker: {
                imei: '864201948201940',
                model: 'Jimi JC400 Dual AI Dashcam',
                protocol: 'STREAMAX_MDVR',
                simCardNumber: '+231 77 889 0011',
                batteryBackupPct: 98,
                voltageInput: 13.9
            }
        },
        {
            companyId: comp2.id,
            name: 'UNOPS Armored Land Cruiser #14',
            make: 'Toyota',
            model: 'Land Cruiser Prado (Armored B6)',
            year: 2023,
            licensePlate: 'UN-44-CD',
            vin: 'JTEBX3FJ8MK091823',
            color: 'UN White',
            vehicleType: 'CAR',
            status: 'IN_TRANSIT',
            driverName: 'Moses V. Tarpeh',
            driverPhone: '+231 88 554 1122',
            currentLat: 6.3190,
            currentLng: -10.8140,
            speed: 36.0,
            heading: 220.0,
            batteryLevel: 94,
            signalStrength: 96,
            fuelLevel: 78.0,
            odometerKm: 29400,
            engineRpm: 1800,
            coolantTemp: 86,
            isIgnitionOn: true,
            geofenceZone: 'UN Diplomatic & Mission Zone',
            tracker: {
                imei: '357890192837482',
                model: 'Teltonika FMB920 Hardwired',
                protocol: 'TELTONIKA',
                simCardNumber: '+231 88 123 9988',
                batteryBackupPct: 100,
                voltageInput: 14.1
            }
        },
        {
            companyId: comp2.id,
            name: 'UN Field Support Ambulance #03',
            make: 'Toyota',
            model: 'HiAce High Roof Ambulance',
            year: 2022,
            licensePlate: 'UN-MED-03',
            vin: 'JT3HN84P4M0192847',
            color: 'White/Red Star of Life',
            vehicleType: 'DELIVERY_VAN',
            status: 'IDLE',
            driverName: 'Kpehe Nyumah',
            driverPhone: '+231 77 221 9900',
            currentLat: 6.2980,
            currentLng: -10.7920,
            speed: 0.0,
            heading: 0.0,
            batteryLevel: 89,
            signalStrength: 91,
            fuelLevel: 85.0,
            odometerKm: 41200,
            engineRpm: 750,
            coolantTemp: 82,
            isIgnitionOn: false,
            geofenceZone: 'UN Diplomatic & Mission Zone',
            tracker: {
                imei: '869201948201999',
                model: 'Teltonika FMC003 OBD-II',
                protocol: 'OBD_II_CAN',
                simCardNumber: '+231 88 661 7722',
                batteryBackupPct: 96,
                voltageInput: 12.8
            }
        },
        {
            companyId: comp3.id,
            name: 'Monrovia Express Courier Van #01',
            make: 'Toyota',
            model: 'HiAce Cargo Van',
            year: 2021,
            licensePlate: 'EXP-VAN-101',
            vin: 'JT1HX02D9L0918234',
            color: 'Navy Blue / Yellow',
            vehicleType: 'DELIVERY_VAN',
            status: 'IN_TRANSIT',
            driverName: 'Joseph K. Sackie',
            driverPhone: '+231 88 776 5544',
            currentLat: 6.3080,
            currentLng: -10.8010,
            speed: 31.0,
            heading: 135.0,
            batteryLevel: 91,
            signalStrength: 95,
            fuelLevel: 64.0,
            odometerKm: 68400,
            engineRpm: 1950,
            coolantTemp: 85,
            isIgnitionOn: true,
            geofenceZone: 'Greater Monrovia Delivery Hub',
            tracker: {
                imei: '864201948201901',
                model: 'Concox JM-VL03 4G',
                protocol: 'JIMI_CONCOX',
                simCardNumber: '+231 77 440 1199',
                batteryBackupPct: 92,
                voltageInput: 13.6
            }
        },
        {
            companyId: comp3.id,
            name: 'Rapid Dispatch Motorbike #04',
            make: 'Yamaha',
            model: 'Crux 110',
            year: 2024,
            licensePlate: 'EXP-MB-04',
            vin: 'JY42J01M8PA091823',
            color: 'Bright Red',
            vehicleType: 'MOTORBIKE',
            status: 'ACTIVE',
            driverName: 'Garrison Toe',
            driverPhone: '+231 88 112 3344',
            currentLat: 6.3140,
            currentLng: -10.8090,
            speed: 28.5,
            heading: 310.0,
            batteryLevel: 95,
            signalStrength: 98,
            fuelLevel: 88.0,
            odometerKm: 9400,
            engineRpm: 3200,
            coolantTemp: 78,
            isIgnitionOn: true,
            geofenceZone: 'Greater Monrovia Delivery Hub',
            tracker: {
                imei: '869201948201938',
                model: 'Teltonika FMB920 Mini GPS',
                protocol: 'TELTONIKA',
                simCardNumber: '+231 88 221 0044',
                batteryBackupPct: 100,
                voltageInput: 12.6
            }
        },
        {
            companyId: comp4.id,
            name: 'Total Fuel Tanker Rig #03',
            make: 'Mercedes-Benz',
            model: 'Actros 3340 (30,000L Fuel Tanker)',
            year: 2022,
            licensePlate: 'TOT-TNK-03',
            vin: 'WDB9340321L091824',
            color: 'White/Red Total Livery',
            vehicleType: 'TRUCK',
            status: 'IN_TRANSIT',
            driverName: 'Patrick O. Bility',
            driverPhone: '+231 77 110 4488',
            currentLat: 6.3260,
            currentLng: -10.7720,
            speed: 38.0,
            heading: 95.0,
            batteryLevel: 99,
            signalStrength: 97,
            fuelLevel: 72.0,
            odometerKm: 52100,
            engineRpm: 1400,
            coolantTemp: 87,
            isIgnitionOn: true,
            geofenceZone: 'Somalia Drive Tanker Route',
            tracker: {
                imei: '358920104829777',
                model: 'Teltonika FMC130 Heavy CAN',
                protocol: 'TELTONIKA',
                simCardNumber: '+231 88 777 9900',
                batteryBackupPct: 100,
                voltageInput: 24.5
            }
        }
    ];

    for (const v of vehicleData) {
        console.log(`Seeding Vehicle & Tracker: ${v.name}...`);
        const { tracker, ...vDetails } = v;
        
        let existingV = await prisma.vehicle.findFirst({
            where: { name: v.name, companyId: v.companyId }
        });

        let vehicleRecord;
        if (existingV) {
            vehicleRecord = await prisma.vehicle.update({
                where: { id: existingV.id },
                data: vDetails
            });
        } else {
            vehicleRecord = await prisma.vehicle.create({
                data: vDetails
            });
        }

        if (tracker) {
            await prisma.trackerDevice.upsert({
                where: { imei: tracker.imei },
                update: {
                    model: tracker.model,
                    protocol: tracker.protocol,
                    simCardNumber: tracker.simCardNumber,
                    companyId: v.companyId,
                    vehicleId: vehicleRecord.id,
                    status: 'ONLINE',
                    lastPing: new Date()
                },
                create: {
                    imei: tracker.imei,
                    model: tracker.model,
                    protocol: tracker.protocol,
                    simCardNumber: tracker.simCardNumber,
                    companyId: v.companyId,
                    vehicleId: vehicleRecord.id,
                    status: 'ONLINE',
                    lastPing: new Date(),
                    batteryBackupPct: tracker.batteryBackupPct || 100,
                    voltageInput: tracker.voltageInput || 13.5
                }
            });
        }
    }

    console.log('Seed completed successfully with Companies, Vehicles, Hardware Trackers & Geofences!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
