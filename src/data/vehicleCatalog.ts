export interface VehicleModelSpec {
  model: string;
  seats: number;
  cargoCases: number;
  vehicleClass: string;
  dailyRate: number;
  agency?: string;
}

export interface VehicleMakeCatalog {
  make: string;
  defaultDailyRate: number;
  rateRange: string;
  models: VehicleModelSpec[];
}

export const VEHICLE_CATALOG: Record<string, VehicleMakeCatalog> = {
  Chevrolet: {
    make: "Chevrolet",
    defaultDailyRate: 210,
    rateRange: "$140 - $230/day",
    models: [
      {
        model: "Suburban High Country",
        seats: 8,
        cargoCases: 6,
        vehicleClass: "Full-Size Extended SUV",
        dailyRate: 210,
        agency: "National Emerald Club",
      },
      {
        model: "Suburban Premier / LT",
        seats: 8,
        cargoCases: 6,
        vehicleClass: "Full-Size Extended SUV",
        dailyRate: 195,
        agency: "Enterprise Plus",
      },
      {
        model: "Tahoe Premier",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Full-Size SUV",
        dailyRate: 180,
        agency: "National Emerald Club",
      },
      {
        model: "Tahoe Z71",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Full-Size SUV",
        dailyRate: 185,
        agency: "Hertz Gold Plus",
      },
      {
        model: "Express 3500 Passenger Van",
        seats: 15,
        cargoCases: 10,
        vehicleClass: "15-Passenger Commercial Van",
        dailyRate: 230,
        agency: "Hertz Commercial",
      },
      {
        model: "Express 2500 Passenger Van",
        seats: 12,
        cargoCases: 8,
        vehicleClass: "12-Passenger Shuttle Van",
        dailyRate: 210,
        agency: "Enterprise Commercial",
      },
      {
        model: "Traverse Premier",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 150,
        agency: "Avis Preferred",
      },
      {
        model: "Silverado 1500 Crew Cab",
        seats: 5,
        cargoCases: 5,
        vehicleClass: "Full-Size Crew Cab Truck",
        dailyRate: 140,
        agency: "Enterprise Plus",
      },
      {
        model: "Colorado Crew Cab",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Mid-Size Crew Cab Truck",
        dailyRate: 125,
        agency: "Budget",
      },
      {
        model: "Malibu LT",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Mid-Size Executive Sedan",
        dailyRate: 95,
        agency: "National Emerald Club",
      },
    ],
  },

  Cadillac: {
    make: "Cadillac",
    defaultDailyRate: 265,
    rateRange: "$160 - $320/day",
    models: [
      {
        model: "Escalade ESV Premium",
        seats: 7,
        cargoCases: 5,
        vehicleClass: "Luxury Extended SUV",
        dailyRate: 275,
        agency: "Hertz President's Circle",
      },
      {
        model: "Escalade Luxury",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Luxury Full-Size SUV",
        dailyRate: 245,
        agency: "National Executive VIP",
      },
      {
        model: "Escalade V-Series",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Ultra-Luxury Performance SUV",
        dailyRate: 320,
        agency: "Sixt Executive",
      },
      {
        model: "XT6 Luxury",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Luxury Mid-Size 3-Row SUV",
        dailyRate: 190,
        agency: "Avis Preferred",
      },
      {
        model: "XT5 Luxury",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Luxury Compact SUV",
        dailyRate: 160,
        agency: "National Emerald Club",
      },
      {
        model: "Lyriq EV",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Luxury Electric SUV",
        dailyRate: 220,
        agency: "Hertz EV Fleet",
      },
      {
        model: "CT5 Executive Sedan",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Luxury Executive Sedan",
        dailyRate: 145,
        agency: "Enterprise Plus",
      },
    ],
  },

  Ford: {
    make: "Ford",
    defaultDailyRate: 215,
    rateRange: "$135 - $240/day",
    models: [
      {
        model: "Transit 350 XLT Passenger Van",
        seats: 15,
        cargoCases: 10,
        vehicleClass: "15-Passenger Extended Van",
        dailyRate: 240,
        agency: "Enterprise Commercial",
      },
      {
        model: "Transit 250 Passenger Wagon",
        seats: 12,
        cargoCases: 8,
        vehicleClass: "12-Passenger Shuttle Van",
        dailyRate: 215,
        agency: "Budget Van Fleet",
      },
      {
        model: "Transit Cargo High Roof",
        seats: 2,
        cargoCases: 14,
        vehicleClass: "Commercial Cargo Van",
        dailyRate: 180,
        agency: "Hertz Commercial",
      },
      {
        model: "Expedition MAX Limited",
        seats: 8,
        cargoCases: 6,
        vehicleClass: "Full-Size Extended SUV",
        dailyRate: 205,
        agency: "Enterprise Plus",
      },
      {
        model: "Expedition XLT",
        seats: 8,
        cargoCases: 4,
        vehicleClass: "Full-Size SUV",
        dailyRate: 180,
        agency: "National Emerald Club",
      },
      {
        model: "Explorer Limited",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 145,
        agency: "Avis Preferred",
      },
      {
        model: "F-150 SuperCrew",
        seats: 5,
        cargoCases: 5,
        vehicleClass: "Full-Size Crew Cab Truck",
        dailyRate: 135,
        agency: "Enterprise Plus",
      },
      {
        model: "F-250 Super Duty Crew",
        seats: 5,
        cargoCases: 6,
        vehicleClass: "Heavy-Duty Utility Truck",
        dailyRate: 165,
        agency: "Hertz Commercial",
      },
    ],
  },

  GMC: {
    make: "GMC",
    defaultDailyRate: 215,
    rateRange: "$145 - $235/day",
    models: [
      {
        model: "Yukon XL Denali",
        seats: 8,
        cargoCases: 6,
        vehicleClass: "Full-Size Extended SUV",
        dailyRate: 220,
        agency: "Avis Preferred",
      },
      {
        model: "Yukon XL SLT",
        seats: 8,
        cargoCases: 6,
        vehicleClass: "Full-Size Extended SUV",
        dailyRate: 200,
        agency: "Enterprise Plus",
      },
      {
        model: "Yukon Denali",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Full-Size SUV",
        dailyRate: 195,
        agency: "National Emerald Club",
      },
      {
        model: "Savana 3500 Passenger Van",
        seats: 15,
        cargoCases: 10,
        vehicleClass: "15-Passenger Commercial Van",
        dailyRate: 230,
        agency: "Hertz Commercial",
      },
      {
        model: "Savana 2500 Passenger Van",
        seats: 12,
        cargoCases: 8,
        vehicleClass: "12-Passenger Shuttle Van",
        dailyRate: 210,
        agency: "Enterprise Commercial",
      },
      {
        model: "Acadia Denali",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 160,
        agency: "Budget",
      },
      {
        model: "Sierra 1500 Crew Cab",
        seats: 5,
        cargoCases: 5,
        vehicleClass: "Full-Size Crew Cab Truck",
        dailyRate: 145,
        agency: "National Emerald Club",
      },
    ],
  },

  "Mercedes-Benz": {
    make: "Mercedes-Benz",
    defaultDailyRate: 295,
    rateRange: "$195 - $350/day",
    models: [
      {
        model: "Sprinter 2500 Passenger High Roof",
        seats: 12,
        cargoCases: 8,
        vehicleClass: "Luxury Passenger Shuttle",
        dailyRate: 320,
        agency: "Blacklane / Executive Fleet",
      },
      {
        model: "Sprinter 3500 Passenger",
        seats: 15,
        cargoCases: 10,
        vehicleClass: "Luxury Commercial Shuttle",
        dailyRate: 350,
        agency: "Executive Chauffeur",
      },
      {
        model: "Metris Passenger Van",
        seats: 8,
        cargoCases: 5,
        vehicleClass: "Executive Minivan",
        dailyRate: 210,
        agency: "Sixt Executive",
      },
      {
        model: "GLS 450 4MATIC",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Luxury Full-Size 3-Row SUV",
        dailyRate: 285,
        agency: "Sixt Luxury",
      },
      {
        model: "GLE 350 4MATIC",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Luxury Mid-Size SUV",
        dailyRate: 210,
        agency: "Hertz President's Circle",
      },
      {
        model: "S-Class Sedan",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Ultra-Luxury VIP Sedan",
        dailyRate: 320,
        agency: "Executive VIP Fleet",
      },
      {
        model: "E-Class Sedan",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Executive Sedan",
        dailyRate: 195,
        agency: "National Executive VIP",
      },
    ],
  },

  Lincoln: {
    make: "Lincoln",
    defaultDailyRate: 255,
    rateRange: "$165 - $275/day",
    models: [
      {
        model: "Navigator L Reserve",
        seats: 7,
        cargoCases: 5,
        vehicleClass: "Luxury Extended SUV",
        dailyRate: 265,
        agency: "Sixt Executive",
      },
      {
        model: "Navigator Reserve",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Luxury Full-Size SUV",
        dailyRate: 235,
        agency: "Hertz President's Circle",
      },
      {
        model: "Aviator Grand Touring",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Luxury Mid-Size 3-Row SUV",
        dailyRate: 195,
        agency: "National Executive VIP",
      },
      {
        model: "Nautilus",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Luxury Compact SUV",
        dailyRate: 165,
        agency: "Enterprise Plus",
      },
    ],
  },

  Toyota: {
    make: "Toyota",
    defaultDailyRate: 165,
    rateRange: "$95 - $190/day",
    models: [
      {
        model: "Sienna Limited AWD Hybrid",
        seats: 8,
        cargoCases: 5,
        vehicleClass: "Minivan Hybrid",
        dailyRate: 165,
        agency: "National Emerald Club",
      },
      {
        model: "Sienna XLE",
        seats: 8,
        cargoCases: 5,
        vehicleClass: "Minivan Hybrid",
        dailyRate: 155,
        agency: "Enterprise Plus",
      },
      {
        model: "Sequoia Platinum",
        seats: 8,
        cargoCases: 4,
        vehicleClass: "Full-Size SUV",
        dailyRate: 190,
        agency: "Hertz Gold Plus",
      },
      {
        model: "Grand Highlander",
        seats: 8,
        cargoCases: 4,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 170,
        agency: "Avis Preferred",
      },
      {
        model: "Highlander Hybrid",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 145,
        agency: "Budget",
      },
      {
        model: "4Runner TRD Off-Road",
        seats: 5,
        cargoCases: 4,
        vehicleClass: "Mid-Size Utility SUV",
        dailyRate: 130,
        agency: "Enterprise Plus",
      },
      {
        model: "Tundra CrewMax",
        seats: 5,
        cargoCases: 5,
        vehicleClass: "Full-Size Crew Cab Truck",
        dailyRate: 145,
        agency: "Hertz Commercial",
      },
      {
        model: "RAV4 Hybrid",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Compact SUV Hybrid",
        dailyRate: 110,
        agency: "National Emerald Club",
      },
      {
        model: "Camry SE",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Mid-Size Sedan",
        dailyRate: 95,
        agency: "National Emerald Club",
      },
    ],
  },

  Chrysler: {
    make: "Chrysler",
    defaultDailyRate: 170,
    rateRange: "$150 - $185/day",
    models: [
      {
        model: "Pacifica Touring L",
        seats: 7,
        cargoCases: 5,
        vehicleClass: "Passenger Minivan",
        dailyRate: 170,
        agency: "Avis Preferred",
      },
      {
        model: "Pacifica Hybrid Pinnacle",
        seats: 7,
        cargoCases: 5,
        vehicleClass: "Luxury Minivan Hybrid",
        dailyRate: 185,
        agency: "National Emerald Club",
      },
      {
        model: "Voyager",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Passenger Minivan",
        dailyRate: 150,
        agency: "Enterprise Plus",
      },
    ],
  },

  Tesla: {
    make: "Tesla",
    defaultDailyRate: 230,
    rateRange: "$135 - $290/day",
    models: [
      {
        model: "Model X Plaid",
        seats: 6,
        cargoCases: 3,
        vehicleClass: "Electric Luxury SUV",
        dailyRate: 290,
        agency: "Hertz EV Fleet",
      },
      {
        model: "Model Y Long Range",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Electric 3-Row Compact SUV",
        dailyRate: 175,
        agency: "Hertz EV Fleet",
      },
      {
        model: "Cybertruck Dual Motor",
        seats: 5,
        cargoCases: 6,
        vehicleClass: "Electric Utility Truck",
        dailyRate: 280,
        agency: "Hertz EV Fleet",
      },
      {
        model: "Model S Dual Motor",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Electric Executive Sedan",
        dailyRate: 180,
        agency: "Sixt Executive EV",
      },
      {
        model: "Model 3 Long Range",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Electric Compact Sedan",
        dailyRate: 135,
        agency: "Hertz EV Fleet",
      },
    ],
  },

  Jeep: {
    make: "Jeep",
    defaultDailyRate: 195,
    rateRange: "$140 - $270/day",
    models: [
      {
        model: "Grand Wagoneer L",
        seats: 8,
        cargoCases: 6,
        vehicleClass: "Luxury Extended SUV",
        dailyRate: 270,
        agency: "Sixt Luxury",
      },
      {
        model: "Wagoneer Series III",
        seats: 8,
        cargoCases: 5,
        vehicleClass: "Full-Size 3-Row SUV",
        dailyRate: 210,
        agency: "Hertz Gold Plus",
      },
      {
        model: "Grand Cherokee L",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 165,
        agency: "National Emerald Club",
      },
      {
        model: "Wrangler Unlimited 4-Door",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Off-Road 4x4",
        dailyRate: 145,
        agency: "Avis Preferred",
      },
      {
        model: "Gladiator Rubicon",
        seats: 5,
        cargoCases: 4,
        vehicleClass: "Off-Road Pickup Truck",
        dailyRate: 140,
        agency: "Enterprise Plus",
      },
    ],
  },

  BMW: {
    make: "BMW",
    defaultDailyRate: 260,
    rateRange: "$185 - $280/day",
    models: [
      {
        model: "X7 xDrive40i",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Luxury 3-Row SUV",
        dailyRate: 275,
        agency: "Sixt Luxury",
      },
      {
        model: "X5 xDrive40i",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Luxury Mid-Size SUV",
        dailyRate: 215,
        agency: "Hertz President's Circle",
      },
      {
        model: "7 Series Sedan",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Luxury Executive Sedan",
        dailyRate: 260,
        agency: "Sixt Executive",
      },
      {
        model: "5 Series Sedan",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Executive Sedan",
        dailyRate: 185,
        agency: "National Executive VIP",
      },
    ],
  },

  Audi: {
    make: "Audi",
    defaultDailyRate: 240,
    rateRange: "$175 - $260/day",
    models: [
      {
        model: "Q7 55 TFSI",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Luxury 3-Row SUV",
        dailyRate: 240,
        agency: "Sixt Luxury",
      },
      {
        model: "Q8",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Luxury Mid-Size SUV",
        dailyRate: 230,
        agency: "Hertz President's Circle",
      },
      {
        model: "A8 L",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Luxury Executive Sedan",
        dailyRate: 260,
        agency: "Sixt Executive",
      },
      {
        model: "A6",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Executive Sedan",
        dailyRate: 175,
        agency: "National Executive VIP",
      },
    ],
  },

  Honda: {
    make: "Honda",
    defaultDailyRate: 155,
    rateRange: "$95 - $165/day",
    models: [
      {
        model: "Odyssey Elite",
        seats: 8,
        cargoCases: 5,
        vehicleClass: "Passenger Minivan",
        dailyRate: 165,
        agency: "National Emerald Club",
      },
      {
        model: "Pilot Elite",
        seats: 8,
        cargoCases: 4,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 160,
        agency: "Enterprise Plus",
      },
      {
        model: "Passport Trailsport",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Mid-Size SUV",
        dailyRate: 135,
        agency: "Avis Preferred",
      },
      {
        model: "Ridgeline Crew Cab",
        seats: 5,
        cargoCases: 4,
        vehicleClass: "Mid-Size Crew Truck",
        dailyRate: 130,
        agency: "Budget",
      },
      {
        model: "CR-V Hybrid",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Compact SUV",
        dailyRate: 105,
        agency: "National Emerald Club",
      },
      {
        model: "Accord Touring",
        seats: 5,
        cargoCases: 2,
        vehicleClass: "Mid-Size Sedan",
        dailyRate: 95,
        agency: "National Emerald Club",
      },
    ],
  },

  Nissan: {
    make: "Nissan",
    defaultDailyRate: 150,
    rateRange: "$95 - $220/day",
    models: [
      {
        model: "NV3500 HD Passenger Van",
        seats: 12,
        cargoCases: 8,
        vehicleClass: "12-Passenger Commercial Van",
        dailyRate: 220,
        agency: "Enterprise Commercial",
      },
      {
        model: "Armada Platinum",
        seats: 8,
        cargoCases: 4,
        vehicleClass: "Full-Size SUV",
        dailyRate: 175,
        agency: "Hertz Gold Plus",
      },
      {
        model: "Pathfinder Rock Creek",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 140,
        agency: "Avis Preferred",
      },
      {
        model: "Frontier Crew Cab",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Mid-Size Truck",
        dailyRate: 120,
        agency: "Budget",
      },
      {
        model: "Rogue",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Compact SUV",
        dailyRate: 105,
        agency: "National Emerald Club",
      },
    ],
  },

  Hyundai: {
    make: "Hyundai",
    defaultDailyRate: 145,
    rateRange: "$95 - $160/day",
    models: [
      {
        model: "Palisade Calligraphy",
        seats: 8,
        cargoCases: 4,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 160,
        agency: "National Emerald Club",
      },
      {
        model: "Santa Fe Hybrid",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 135,
        agency: "Enterprise Plus",
      },
      {
        model: "Ioniq 5 EV",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Electric Crossover",
        dailyRate: 140,
        agency: "Hertz EV Fleet",
      },
      {
        model: "Tucson",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Compact SUV",
        dailyRate: 105,
        agency: "Avis Preferred",
      },
    ],
  },

  Kia: {
    make: "Kia",
    defaultDailyRate: 155,
    rateRange: "$95 - $240/day",
    models: [
      {
        model: "Carnival MPV SX Prestige",
        seats: 8,
        cargoCases: 5,
        vehicleClass: "Multi-Purpose Minivan",
        dailyRate: 170,
        agency: "National Emerald Club",
      },
      {
        model: "Telluride SX Prestige",
        seats: 8,
        cargoCases: 4,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 165,
        agency: "Enterprise Plus",
      },
      {
        model: "EV9 3-Row Electric SUV",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Electric 3-Row SUV",
        dailyRate: 240,
        agency: "Hertz EV Fleet",
      },
      {
        model: "Sorento Hybrid",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 135,
        agency: "Avis Preferred",
      },
      {
        model: "Sportage",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Compact SUV",
        dailyRate: 105,
        agency: "Budget",
      },
    ],
  },

  Volvo: {
    make: "Volvo",
    defaultDailyRate: 215,
    rateRange: "$165 - $225/day",
    models: [
      {
        model: "XC90 Recharge",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Luxury 3-Row SUV",
        dailyRate: 225,
        agency: "Sixt Luxury",
      },
      {
        model: "XC60 Recharge",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Luxury Mid-Size SUV",
        dailyRate: 165,
        agency: "Hertz President's Circle",
      },
    ],
  },

  "Land Rover": {
    make: "Land Rover",
    defaultDailyRate: 275,
    rateRange: "$235 - $380/day",
    models: [
      {
        model: "Defender 130",
        seats: 8,
        cargoCases: 4,
        vehicleClass: "Luxury 3-Row Off-Road SUV",
        dailyRate: 260,
        agency: "Sixt Luxury",
      },
      {
        model: "Defender 110",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Luxury Off-Road SUV",
        dailyRate: 235,
        agency: "National Executive VIP",
      },
      {
        model: "Range Rover LWB",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Ultra-Luxury Extended SUV",
        dailyRate: 380,
        agency: "Executive Chauffeur",
      },
    ],
  },

  Lexus: {
    make: "Lexus",
    defaultDailyRate: 220,
    rateRange: "$175 - $265/day",
    models: [
      {
        model: "LX 600 Luxury",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Luxury Full-Size SUV",
        dailyRate: 265,
        agency: "Sixt Luxury",
      },
      {
        model: "TX 350",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Luxury 3-Row SUV",
        dailyRate: 210,
        agency: "National Executive VIP",
      },
      {
        model: "GX 550 Overtrail",
        seats: 7,
        cargoCases: 3,
        vehicleClass: "Luxury Off-Road SUV",
        dailyRate: 225,
        agency: "Hertz President's Circle",
      },
      {
        model: "RX 350",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Luxury Mid-Size SUV",
        dailyRate: 175,
        agency: "Enterprise Plus",
      },
    ],
  },

  Dodge: {
    make: "Dodge",
    defaultDailyRate: 175,
    rateRange: "$145 - $210/day",
    models: [
      {
        model: "Durango R/T",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Full-Size 3-Row SUV",
        dailyRate: 175,
        agency: "Avis Preferred",
      },
      {
        model: "Grand Caravan",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Passenger Minivan",
        dailyRate: 145,
        agency: "Enterprise Plus",
      },
    ],
  },

  Ram: {
    make: "Ram",
    defaultDailyRate: 165,
    rateRange: "$145 - $215/day",
    models: [
      {
        model: "1500 Crew Cab Big Horn",
        seats: 5,
        cargoCases: 5,
        vehicleClass: "Full-Size Crew Cab Truck",
        dailyRate: 145,
        agency: "Enterprise Commercial",
      },
      {
        model: "ProMaster Passenger Van",
        seats: 12,
        cargoCases: 8,
        vehicleClass: "12-Passenger Shuttle Van",
        dailyRate: 215,
        agency: "Hertz Commercial",
      },
    ],
  },

  Subaru: {
    make: "Subaru",
    defaultDailyRate: 130,
    rateRange: "$115 - $150/day",
    models: [
      {
        model: "Ascent Touring",
        seats: 8,
        cargoCases: 4,
        vehicleClass: "Mid-Size 3-Row SUV",
        dailyRate: 150,
        agency: "National Emerald Club",
      },
      {
        model: "Outback Wilderness",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Mid-Size Crossover AWD",
        dailyRate: 120,
        agency: "Avis Preferred",
      },
      {
        model: "Forester",
        seats: 5,
        cargoCases: 3,
        vehicleClass: "Compact SUV AWD",
        dailyRate: 115,
        agency: "Budget",
      },
    ],
  },

  Rivian: {
    make: "Rivian",
    defaultDailyRate: 265,
    rateRange: "$250 - $275/day",
    models: [
      {
        model: "R1S Adventure 3-Row",
        seats: 7,
        cargoCases: 4,
        vehicleClass: "Electric Luxury 3-Row SUV",
        dailyRate: 275,
        agency: "Sixt Executive EV",
      },
      {
        model: "R1T Adventure",
        seats: 5,
        cargoCases: 5,
        vehicleClass: "Electric Utility Truck",
        dailyRate: 250,
        agency: "Enterprise Plus",
      },
    ],
  },
};

export const ALL_VEHICLE_MAKES = Object.keys(VEHICLE_CATALOG);

export function getModelsForMake(make: string): VehicleModelSpec[] {
  if (!make) return [];
  const found = Object.entries(VEHICLE_CATALOG).find(
    ([k]) => k.toLowerCase() === make.trim().toLowerCase()
  );
  return found ? found[1].models : [];
}

export function getDefaultRateForMake(make: string): {
  defaultDailyRate: number;
  rateRange: string;
  suggestedRates: number[];
} {
  const found = Object.entries(VEHICLE_CATALOG).find(
    ([k]) => k.toLowerCase() === make.trim().toLowerCase()
  );
  if (found) {
    const d = found[1].defaultDailyRate;
    return {
      defaultDailyRate: d,
      rateRange: found[1].rateRange,
      suggestedRates: [
        Math.round(d * 0.8),
        d,
        Math.round(d * 1.15),
        Math.round(d * 1.3),
      ],
    };
  }
  return {
    defaultDailyRate: 195,
    rateRange: "$150 - $250/day",
    suggestedRates: [150, 195, 240, 280],
  };
}

export function resolveVehicleSpecs(
  make: string,
  model: string
): VehicleModelSpec | null {
  if (!model) return null;
  const models = getModelsForMake(make);
  const cleanModel = model.trim().toLowerCase();

  // 1. Exact match in catalog
  const exact = models.find((m) => m.model.toLowerCase() === cleanModel);
  if (exact) return exact;

  // 2. Partial/contains match
  const partial = models.find(
    (m) =>
      cleanModel.includes(m.model.toLowerCase()) ||
      m.model.toLowerCase().includes(cleanModel)
  );
  if (partial) return partial;

  // 3. Fallback smart heuristics
  return inferVehicleHeuristics(make, model);
}

export function inferVehicleHeuristics(
  make: string,
  model: string
): VehicleModelSpec {
  const full = `${make} ${model}`.toLowerCase();

  // 15 Passenger Vans
  if (
    full.includes("15 passenger") ||
    full.includes("15-passenger") ||
    full.includes("transit 350") ||
    full.includes("express 3500") ||
    full.includes("savana 3500") ||
    full.includes("e-350")
  ) {
    return {
      model,
      seats: 15,
      cargoCases: 10,
      vehicleClass: "15-Passenger Commercial Van",
      dailyRate: 235,
    };
  }

  // 12 Passenger Vans
  if (
    full.includes("12 passenger") ||
    full.includes("12-passenger") ||
    full.includes("transit 250") ||
    full.includes("sprinter") ||
    full.includes("express 2500") ||
    full.includes("savana 2500") ||
    full.includes("nv3500") ||
    full.includes("promaster")
  ) {
    return {
      model,
      seats: 12,
      cargoCases: 8,
      vehicleClass: "12-Passenger Shuttle Van",
      dailyRate: 215,
    };
  }

  // 8 Passenger Extended SUVs & Minivans
  if (
    full.includes("suburban") ||
    full.includes("expedition max") ||
    full.includes("yukon xl") ||
    full.includes("wagoneer l") ||
    full.includes("defender 130") ||
    full.includes("sienna") ||
    full.includes("odyssey") ||
    full.includes("carnival") ||
    full.includes("sequoia") ||
    full.includes("grand highlander") ||
    full.includes("palisade") ||
    full.includes("telluride") ||
    full.includes("pilot") ||
    full.includes("ascent")
  ) {
    return {
      model,
      seats: 8,
      cargoCases: 6,
      vehicleClass: full.includes("sienna") || full.includes("odyssey") || full.includes("carnival")
        ? "Passenger Minivan"
        : "Full-Size Extended SUV",
      dailyRate: full.includes("denali") || full.includes("wagoneer") ? 225 : 195,
    };
  }

  // 7 Passenger Luxury & Mid-Size SUVs
  if (
    full.includes("escalade") ||
    full.includes("navigator") ||
    full.includes("tahoe") ||
    full.includes("yukon") ||
    full.includes("expedition") ||
    full.includes("gls") ||
    full.includes("x7") ||
    full.includes("q7") ||
    full.includes("xc90") ||
    full.includes("pacifica") ||
    full.includes("traverse") ||
    full.includes("pathfinder") ||
    full.includes("highlander") ||
    full.includes("explorer") ||
    full.includes("durango") ||
    full.includes("grand cherokee l") ||
    full.includes("tx 350") ||
    full.includes("lx 600") ||
    full.includes("r1s") ||
    full.includes("ev9")
  ) {
    return {
      model,
      seats: 7,
      cargoCases: 4,
      vehicleClass:
        full.includes("escalade") || full.includes("navigator") || full.includes("gls") || full.includes("x7")
          ? "Luxury Extended SUV"
          : "Full-Size 3-Row SUV",
      dailyRate: full.includes("escalade") || full.includes("navigator") ? 265 : 185,
    };
  }

  // 6 Passenger
  if (full.includes("model x")) {
    return {
      model,
      seats: 6,
      cargoCases: 3,
      vehicleClass: "Electric Luxury SUV",
      dailyRate: 290,
    };
  }

  // 5 Passenger Trucks & Sedans
  if (
    full.includes("f-150") ||
    full.includes("silverado") ||
    full.includes("sierra") ||
    full.includes("ram") ||
    full.includes("tundra") ||
    full.includes("truck") ||
    full.includes("sedan") ||
    full.includes("camry") ||
    full.includes("accord") ||
    full.includes("model 3") ||
    full.includes("model s") ||
    full.includes("rav4") ||
    full.includes("cr-v") ||
    full.includes("rogue")
  ) {
    return {
      model,
      seats: 5,
      cargoCases: 3,
      vehicleClass: full.includes("truck") || full.includes("150") || full.includes("silverado")
        ? "Full-Size Crew Cab Truck"
        : "Standard Passenger Vehicle",
      dailyRate: 135,
    };
  }

  // Default fallback
  return {
    model,
    seats: 7,
    cargoCases: 4,
    vehicleClass: "Standard Corporate Vehicle",
    dailyRate: 180,
  };
}

export function formatVehicleName(
  make: string,
  model: string,
  capacity: number
): string {
  const mk = (make || "").trim();
  const mdl = (model || "").trim();
  const capStr = capacity ? `(${capacity} Seats)` : "";

  if (mk && mdl) {
    const cleanMdl = mdl.toLowerCase().startsWith(mk.toLowerCase())
      ? mdl.slice(mk.length).trim()
      : mdl;
    return `${mk} ${cleanMdl} ${capStr}`.replace(/\s+/g, " ").trim();
  }
  if (mdl) return `${mdl} ${capStr}`.replace(/\s+/g, " ").trim();
  if (mk) return `${mk} Fleet Unit ${capStr}`.replace(/\s+/g, " ").trim();
  return `Vehicle Unit ${capStr}`.trim();
}
