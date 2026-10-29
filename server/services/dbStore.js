// server/services/dbStore.js - Resilient Multi-Engine Data Store for Mysuru Critical Emergency Operations
const mongoose = require("mongoose");

function createId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  const random = "xxxxxxxxxxxxxxxx".replace(/[x]/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
  return timestamp + random;
}

const memoryDB = {
  users: [],
  hospitals: [],
  ambulances: [],
  emergencies: []
};

let isMongoConnected = false;

// 10 Real Major Hospitals Across Mysuru
const initialHospitals = [
  {
    _id: "66d000000000000000000001",
    name: "Apollo BGS Hospital",
    address: { street: "Adhichunchanagiri Road, Kuvempunagar", city: "Mysuru", state: "Karnataka", pincode: "570023" },
    location: { type: "Point", coordinates: [76.6264, 12.2982] },
    phone: "+91 821 2568888",
    facilities: ["Level-1 Trauma Center", "Emergency ICU", "24/7 Cath Lab", "Neuro Surgery", "Blood Bank", "CT Scanner"],
    totalBeds: 160,
    availableBeds: 45,
    totalIcuBeds: 30,
    availableIcuBeds: 8,
    oxygenBeds: 35,
    bloodBankReady: true,
    totalAmbulances: 6,
    availableAmbulances: 4,
    emergencyAvailable: true,
    admittedPatientsCount: 14,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66d000000000000000000002",
    name: "Columbia Asia Hospital (Manipal Hospital)",
    address: { street: "Bangalore-Mysore Ring Road, Bannimantap 'A' Layout", city: "Mysuru", state: "Karnataka", pincode: "570015" },
    location: { type: "Point", coordinates: [76.6492, 12.3391] },
    phone: "+91 821 3989898",
    facilities: ["Super-Speciality Trauma", "Critical Care ICU", "Orthopedics", "Pediatric Trauma", "24/7 OT", "Dialysis"],
    totalBeds: 120,
    availableBeds: 32,
    totalIcuBeds: 22,
    availableIcuBeds: 6,
    oxygenBeds: 25,
    bloodBankReady: true,
    totalAmbulances: 4,
    availableAmbulances: 2,
    emergencyAvailable: true,
    admittedPatientsCount: 11,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66d000000000000000000003",
    name: "Narayana Multispeciality Hospital",
    address: { street: "Devanur 3rd Stage, Outer Ring Road", city: "Mysuru", state: "Karnataka", pincode: "570019" },
    location: { type: "Point", coordinates: [76.6805, 12.3214] },
    phone: "+91 821 7122222",
    facilities: ["Cardiac Emergency", "Coronary Care Unit", "Pulmonology", "Burn Unit", "Emergency Surgery"],
    totalBeds: 180,
    availableBeds: 62,
    totalIcuBeds: 36,
    availableIcuBeds: 12,
    oxygenBeds: 40,
    bloodBankReady: true,
    totalAmbulances: 5,
    availableAmbulances: 3,
    emergencyAvailable: true,
    admittedPatientsCount: 19,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66d000000000000000000004",
    name: "JSS Hospital (Jagadguru Sri Shivarathreeshwara)",
    address: { street: "Ramanuja Road / MG Road, Agrahara", city: "Mysuru", state: "Karnataka", pincode: "570004" },
    location: { type: "Point", coordinates: [76.6578, 12.2965] },
    phone: "+91 821 2335555",
    facilities: ["1800-Bed Tertiary Care", "Comprehensive Trauma", "Apex ICU", "Blood Bank", "Pediatric Surgery"],
    totalBeds: 250,
    availableBeds: 85,
    totalIcuBeds: 45,
    availableIcuBeds: 15,
    oxygenBeds: 60,
    bloodBankReady: true,
    totalAmbulances: 7,
    availableAmbulances: 4,
    emergencyAvailable: true,
    admittedPatientsCount: 32,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66d000000000000000000005",
    name: "KR Hospital (King Edward VII Memorial Hospital)",
    address: { street: "Sayyaji Rao Road, Mandi Mohalla", city: "Mysuru", state: "Karnataka", pincode: "570001" },
    location: { type: "Point", coordinates: [76.6508, 12.3168] },
    phone: "+91 821 2420000",
    facilities: ["Apex Government Trauma Casualty", "24/7 Emergency Wing", "Major OT", "Blood Bank", "Burn Ward"],
    totalBeds: 200,
    availableBeds: 48,
    totalIcuBeds: 28,
    availableIcuBeds: 5,
    oxygenBeds: 50,
    bloodBankReady: true,
    totalAmbulances: 5,
    availableAmbulances: 3,
    emergencyAvailable: true,
    admittedPatientsCount: 28,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66d000000000000000000006",
    name: "Cauvery Heart & Multi-Speciality Hospital",
    address: { street: "T. Narasipura Road, Siddartha Layout", city: "Mysuru", state: "Karnataka", pincode: "570011" },
    location: { type: "Point", coordinates: [76.6780, 12.2990] },
    phone: "+91 821 2470000",
    facilities: ["Interventional Cardiology", "Cardio-Thoracic Surgery", "Emergency ICU", "Neurology"],
    totalBeds: 110,
    availableBeds: 34,
    totalIcuBeds: 18,
    availableIcuBeds: 6,
    oxygenBeds: 20,
    bloodBankReady: true,
    totalAmbulances: 3,
    availableAmbulances: 2,
    emergencyAvailable: true,
    admittedPatientsCount: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66d000000000000000000007",
    name: "Suyog Hospital",
    address: { street: "Outer Ring Road Junction, Ramakrishnanagar", city: "Mysuru", state: "Karnataka", pincode: "570022" },
    location: { type: "Point", coordinates: [76.6210, 12.2780] },
    phone: "+91 821 2567777",
    facilities: ["Acute Trauma Care", "Orthopedics & Joint Care", "Emergency ICU", "Radiology"],
    totalBeds: 95,
    availableBeds: 29,
    totalIcuBeds: 15,
    availableIcuBeds: 4,
    oxygenBeds: 18,
    bloodBankReady: true,
    totalAmbulances: 3,
    availableAmbulances: 2,
    emergencyAvailable: true,
    admittedPatientsCount: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66d000000000000000000008",
    name: "Holdsworth Memorial (Mission) Hospital",
    address: { street: "Mandi Mohalla, Tilak Nagar", city: "Mysuru", state: "Karnataka", pincode: "570021" },
    location: { type: "Point", coordinates: [76.6470, 12.3245] },
    phone: "+91 821 2521662",
    facilities: ["Trauma Casualty", "Maternity Emergency", "General Surgery", "Pediatrics"],
    totalBeds: 130,
    availableBeds: 42,
    totalIcuBeds: 16,
    availableIcuBeds: 5,
    oxygenBeds: 25,
    bloodBankReady: true,
    totalAmbulances: 3,
    availableAmbulances: 1,
    emergencyAvailable: true,
    admittedPatientsCount: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66d000000000000000000009",
    name: "Bhanavi Hospital",
    address: { street: "New Kantharaj Urs Road, Kuvempunagar", city: "Mysuru", state: "Karnataka", pincode: "570023" },
    location: { type: "Point", coordinates: [76.6310, 12.2920] },
    phone: "+91 821 2542222",
    facilities: ["Emergency Care", "ICU", "Laparoscopic Trauma", "General Medicine"],
    totalBeds: 70,
    availableBeds: 20,
    totalIcuBeds: 10,
    availableIcuBeds: 3,
    oxygenBeds: 15,
    bloodBankReady: false,
    totalAmbulances: 2,
    availableAmbulances: 1,
    emergencyAvailable: true,
    admittedPatientsCount: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66d000000000000000000010",
    name: "St. Joseph's Hospital",
    address: { street: "Bannimantap / Yadavgiri", city: "Mysuru", state: "Karnataka", pincode: "570015" },
    location: { type: "Point", coordinates: [76.6410, 12.3315] },
    phone: "+91 821 2490000",
    facilities: ["Trauma & Orthopedic Emergency", "Critical Resuscitation", "General Surgery"],
    totalBeds: 80,
    availableBeds: 26,
    totalIcuBeds: 12,
    availableIcuBeds: 4,
    oxygenBeds: 16,
    bloodBankReady: true,
    totalAmbulances: 2,
    availableAmbulances: 2,
    emergencyAvailable: true,
    admittedPatientsCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// 25 Active Ambulances Distributed Across Mysuru Neighborhoods
const initialAmbulances = [
  {
    _id: "66e000000000000000000001",
    vehicleNumber: "KA-09-EM-1001",
    driverName: "Rajesh Kumar",
    driverPhone: "+91 98451 22340",
    driverLicense: "KA-09-2015-00441",
    vehicleType: "ALS",
    baseArea: "Kuvempunagar",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6270, 12.2980] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000002",
    vehicleNumber: "KA-09-EM-1002",
    driverName: "Ramesh Rao",
    driverPhone: "+91 98860 33412",
    driverLicense: "KA-09-2017-00912",
    vehicleType: "ALS",
    baseArea: "Gokulam 3rd Stage",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6250, 12.3280] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000003",
    vehicleNumber: "KA-09-EM-1003",
    driverName: "Priya Sharma",
    driverPhone: "+91 97412 88710",
    driverLicense: "KA-09-2019-01284",
    vehicleType: "BLS",
    baseArea: "Saraswathipuram",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6350, 12.3050] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000004",
    vehicleNumber: "KA-09-EM-1004",
    driverName: "Vikram Gowda",
    driverPhone: "+91 99001 55621",
    driverLicense: "KA-09-2016-00318",
    vehicleType: "ALS",
    baseArea: "Vijayanagar 2nd Stage",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6080, 12.3250] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000005",
    vehicleNumber: "KA-09-EM-1005",
    driverName: "Suresh Patel",
    driverPhone: "+91 98440 66782",
    driverLicense: "KA-09-2018-00552",
    vehicleType: "BLS",
    baseArea: "Jayalakshmipuram",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6290, 12.3190] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000006",
    vehicleNumber: "KA-09-EM-1006",
    driverName: "Manjunath K.",
    driverPhone: "+91 98450 11223",
    driverLicense: "KA-09-2014-00109",
    vehicleType: "ALS",
    baseArea: "Bannimantap Ring Road",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6480, 12.3420] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000007",
    vehicleNumber: "KA-09-EM-1007",
    driverName: "Anand Murthy",
    driverPhone: "+91 98800 22334",
    driverLicense: "KA-09-2013-00871",
    vehicleType: "ALS",
    baseArea: "Hebbal Industrial Area",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6020, 12.3580] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000008",
    vehicleNumber: "KA-09-EM-1008",
    driverName: "Kavitha Nair",
    driverPhone: "+91 97400 33445",
    driverLicense: "KA-09-2020-01993",
    vehicleType: "BLS",
    baseArea: "Siddartha Layout",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6770, 12.2980] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000009",
    vehicleNumber: "KA-09-EM-1009",
    driverName: "Chetan Swamy",
    driverPhone: "+91 99011 44556",
    driverLicense: "KA-09-2017-00445",
    vehicleType: "ALS",
    baseArea: "Ramakrishnanagar",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6190, 12.2760] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000010",
    vehicleNumber: "KA-09-EM-1010",
    driverName: "Girish Prasad",
    driverPhone: "+91 98452 55667",
    driverLicense: "KA-09-2015-00678",
    vehicleType: "BLS",
    baseArea: "Dattagalli Ring Road",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6050, 12.2710] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000011",
    vehicleNumber: "KA-09-EM-1011",
    driverName: "Deepak Nayak",
    driverPhone: "+91 98862 66778",
    driverLicense: "KA-09-2018-00789",
    vehicleType: "ALS",
    baseArea: "Vidyaranyapuram",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6490, 12.2850] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000012",
    vehicleNumber: "KA-09-EM-1012",
    driverName: "Raghuveer Hegde",
    driverPhone: "+91 97413 77889",
    driverLicense: "KA-09-2019-01122",
    vehicleType: "BLS",
    baseArea: "Chamundipuram",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6580, 12.2910] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000013",
    vehicleNumber: "KA-09-EM-1013",
    driverName: "Santosh Poojary",
    driverPhone: "+91 99022 88990",
    driverLicense: "KA-09-2016-00456",
    vehicleType: "ALS",
    baseArea: "Nazarbad",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6680, 12.3080] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000014",
    vehicleNumber: "KA-09-EM-1014",
    driverName: "Lokesh Yadav",
    driverPhone: "+91 98453 99001",
    driverLicense: "KA-09-2014-00234",
    vehicleType: "BLS",
    baseArea: "Agrahara",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6540, 12.2970] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000015",
    vehicleNumber: "KA-09-EM-1015",
    driverName: "Harish Bhat",
    driverPhone: "+91 98803 12345",
    driverLicense: "KA-09-2015-00789",
    vehicleType: "ALS",
    baseArea: "Metagalli",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6290, 12.3450] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000016",
    vehicleNumber: "KA-09-EM-1016",
    driverName: "Sunil Dev",
    driverPhone: "+91 97404 23456",
    driverLicense: "KA-09-2020-00890",
    vehicleType: "ALS",
    baseArea: "Hootagalli Junction",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.5820, 12.3410] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000017",
    vehicleNumber: "KA-09-EM-1017",
    driverName: "Vinay Kumar",
    driverPhone: "+91 99014 34567",
    driverLicense: "KA-09-2017-01345",
    vehicleType: "BLS",
    baseArea: "Alanahalli Layout",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6920, 12.2890] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000018",
    vehicleNumber: "KA-09-EM-1018",
    driverName: "Prashanth M.",
    driverPhone: "+91 98454 45678",
    driverLicense: "KA-09-2016-01567",
    vehicleType: "ALS",
    baseArea: "Bogadi 2nd Stage",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.5980, 12.3010] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000019",
    vehicleNumber: "KA-09-EM-1019",
    driverName: "Kishore Shenoy",
    driverPhone: "+91 98864 56789",
    driverLicense: "KA-09-2019-00678",
    vehicleType: "BLS",
    baseArea: "Yadavagiri",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6420, 12.3270] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000020",
    vehicleNumber: "KA-09-EM-1020",
    driverName: "Naveen Acharya",
    driverPhone: "+91 97415 67890",
    driverLicense: "KA-09-2018-00912",
    vehicleType: "ALS",
    baseArea: "Mandi Mohalla",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6490, 12.3150] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000021",
    vehicleNumber: "KA-09-EM-1021",
    driverName: "Mohan Das",
    driverPhone: "+91 99025 78901",
    driverLicense: "KA-09-2015-00345",
    vehicleType: "BLS",
    baseArea: "Tilak Nagar",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6460, 12.3240] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000022",
    vehicleNumber: "KA-09-EM-1022",
    driverName: "Shashi Shekhar",
    driverPhone: "+91 98455 89012",
    driverLicense: "KA-09-2014-00567",
    vehicleType: "ALS",
    baseArea: "Devanur 2nd Stage",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6790, 12.3200] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000023",
    vehicleNumber: "KA-09-EM-1023",
    driverName: "Ravi Teja",
    driverPhone: "+91 98805 90123",
    driverLicense: "KA-09-2020-00789",
    vehicleType: "BLS",
    baseArea: "Shaktinagar",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6850, 12.3380] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000024",
    vehicleNumber: "KA-09-EM-1024",
    driverName: "Arun Kulkarni",
    driverPhone: "+91 97406 01234",
    driverLicense: "KA-09-2017-00678",
    vehicleType: "ALS",
    baseArea: "Srirampura",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.6320, 12.2680] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66e000000000000000000025",
    vehicleNumber: "KA-09-EM-1025",
    driverName: "Dhanush Gowda",
    driverPhone: "+91 99016 12345",
    driverLicense: "KA-09-2019-01456",
    vehicleType: "BLS",
    baseArea: "Roopa Nagar",
    status: "Available",
    emergencyId: null,
    currentLocation: { type: "Point", coordinates: [76.5850, 12.2880] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Seed Users for all Stakeholder Personas
const initialUsers = [
  {
    _id: "66c000000000000000000001",
    googleId: "demo-citizen-id",
    name: "John Citizen",
    email: "citizen@emergency.system",
    role: "citizen",
    phone: "+91 98450 99887",
    profilePicture: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66c000000000000000000002",
    googleId: "demo-dispatcher-id",
    name: "Sarah Dispatcher",
    email: "dispatcher@emergency.system",
    role: "dispatcher",
    phone: "+91 98860 11223",
    profilePicture: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66c000000000000000000003",
    googleId: "demo-hospital-id",
    name: "Dr. Aris Thorne (Apollo BGS Trauma Director)",
    email: "hospital@emergency.system",
    role: "hospital",
    hospitalId: "66d000000000000000000001",
    phone: "+91 821 2568888",
    profilePicture: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66c000000000000000000004",
    googleId: "demo-driver-id",
    name: "Paramedic Rajesh Kumar",
    email: "driver@emergency.system",
    role: "driver",
    ambulanceId: "66e000000000000000000001",
    phone: "+91 98451 22340",
    licenseNumber: "KA-09-2015-00441",
    profilePicture: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    _id: "66c000000000000000000005",
    googleId: "demo-admin-id",
    name: "Chief Admin Elena Vance",
    email: "admin@emergency.system",
    role: "admin",
    phone: "+91 98450 00000",
    profilePicture: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Seed Initial Real-Life Emergencies in Mysuru
const initialEmergencies = [
  {
    _id: "66f000000000000000000001",
    type: "Accident",
    description: "Two-wheeler collided with delivery tempo at Kuvempunagar Double Road. Rider has severe leg fracture and active bleeding.",
    severity: "High",
    latitude: 12.2965,
    longitude: 76.6342,
    status: "Responding",
    userId: "66c000000000000000000001",
    hospitalId: "66d000000000000000000001",
    ambulanceId: "66e000000000000000000001",
    ambulanceStatus: "En Route to Scene",
    patientVitals: { conscious: true, bleeding: true, breathingDifficulty: false, pulse: 92 },
    aiTriage: {
      triageScore: 88,
      triageCode: "Code Red (Immediate / Life-Threatening)",
      badgeColor: "#EF4444",
      detectedCondition: "High-Energy Impact Trauma with Hemorrhage",
      primaryRisk: "Imminent risk of hemorrhagic shock. Immediate pressure dressing & fluid resuscitation needed.",
      clinicalFlags: ["Active Hemorrhage / Musculoskeletal Trauma", "Severe Bleeding Detected"],
      recommendedSpecialties: ["Level-1 Trauma Center", "Emergency ICU", "Orthopedics"]
    },
    userCelebrationSeen: false,
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString()
  },
  {
    _id: "66f000000000000000000002",
    type: "Medical",
    description: "62-year-old resident suffering from severe crushing retrosternal chest pain radiating to left arm. Profuse sweating.",
    severity: "Critical",
    latitude: 12.3310,
    longitude: 76.6420,
    status: "Active",
    userId: "66c000000000000000000001",
    hospitalId: null,
    ambulanceId: null,
    ambulanceStatus: "Pending",
    patientVitals: { conscious: true, bleeding: false, breathingDifficulty: true, pulse: 118 },
    aiTriage: {
      triageScore: 94,
      triageCode: "Code Red (Immediate / Life-Threatening)",
      badgeColor: "#EF4444",
      detectedCondition: "Suspected Acute ST-Elevation Myocardial Infarction",
      primaryRisk: "Imminent cardiac arrest risk. Emergency catheterization lab required.",
      clinicalFlags: ["Possible Acute Coronary Syndrome", "Severe Respiratory Distress"],
      recommendedSpecialties: ["Cardiology Cath Lab", "Emergency ICU"]
    },
    userCelebrationSeen: false,
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString()
  }
];

function seedMemoryDB() {
  memoryDB.hospitals = JSON.parse(JSON.stringify(initialHospitals));
  memoryDB.ambulances = JSON.parse(JSON.stringify(initialAmbulances));
  memoryDB.users = JSON.parse(JSON.stringify(initialUsers));
  memoryDB.emergencies = JSON.parse(JSON.stringify(initialEmergencies));

  // Mark first ambulance as on duty for the active incident
  const amb1 = memoryDB.ambulances.find((a) => a._id === "66e000000000000000000001");
  if (amb1) {
    amb1.status = "On Duty";
    amb1.emergencyId = "66f000000000000000000001";
  }
}
seedMemoryDB();

// Helper to deep populate document fields
function populateDoc(doc, collectionName) {
  if (!doc) return null;
  const clone = JSON.parse(JSON.stringify(doc));

  if (collectionName === "emergencies") {
    if (clone.hospitalId && typeof clone.hospitalId === "string") {
      clone.hospitalId = memoryDB.hospitals.find((h) => String(h._id) === String(clone.hospitalId)) || null;
    }
    if (clone.ambulanceId && typeof clone.ambulanceId === "string") {
      clone.ambulanceId = memoryDB.ambulances.find((a) => String(a._id) === String(clone.ambulanceId)) || null;
    }
    if (clone.userId && typeof clone.userId === "string") {
      const u = memoryDB.users.find((user) => String(user._id) === String(clone.userId));
      clone.userId = u ? { _id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone } : null;
    }
  } else if (collectionName === "ambulances") {
    if (clone.emergencyId && typeof clone.emergencyId === "string") {
      clone.emergencyId = memoryDB.emergencies.find((e) => String(e._id) === String(clone.emergencyId)) || null;
    }
  } else if (collectionName === "users") {
    if (clone.hospitalId && typeof clone.hospitalId === "string") {
      clone.hospital = memoryDB.hospitals.find((h) => String(h._id) === String(clone.hospitalId)) || null;
    }
    if (clone.ambulanceId && typeof clone.ambulanceId === "string") {
      clone.ambulance = memoryDB.ambulances.find((a) => String(a._id) === String(clone.ambulanceId)) || null;
    }
  }

  // Attach mock .save() method
  clone.save = async function () {
    const list = memoryDB[collectionName];
    const idx = list.findIndex((item) => String(item._id) === String(clone._id));
    if (idx !== -1) {
      clone.updatedAt = new Date().toISOString();
      list[idx] = JSON.parse(JSON.stringify(clone));
    }
    return clone;
  };

  return clone;
}

// Memory Query Builder supporting Mongoose chaining (.populate(), .sort(), .limit())
class MemoryQuery {
  constructor(collectionName, items) {
    this.collectionName = collectionName;
    this.items = items;
    this.populateFields = [];
  }

  populate(field, select) {
    this.populateFields.push(field);
    return this;
  }

  sort(criteria) {
    if (criteria && typeof criteria === "object") {
      const [key, dir] = Object.entries(criteria)[0] || [];
      if (key) {
        this.items.sort((a, b) => {
          if (dir === -1) return a[key] < b[key] ? 1 : -1;
          return a[key] > b[key] ? 1 : -1;
        });
      }
    }
    return this;
  }

  limit(count) {
    if (typeof count === "number") {
      this.items = this.items.slice(0, count);
    }
    return this;
  }

  then(resolve, reject) {
    const populated = this.items.map((item) => populateDoc(item, this.collectionName));
    return Promise.resolve(populated).then(resolve, reject);
  }

  catch(reject) {
    return this.then(null, reject);
  }
}

// Model-like interface for in-memory collections
function createMemoryModel(collectionName) {
  return {
    async find(filter = {}) {
      let list = [...memoryDB[collectionName]];

      Object.keys(filter).forEach((k) => {
        if (k === "location" && filter[k]?.$near) {
          // Haversine sorting handled in services
        } else if (filter[k] !== undefined) {
          list = list.filter((item) => String(item[k]) === String(filter[k]));
        }
      });

      return new MemoryQuery(collectionName, list);
    },

    async findOne(filter = {}) {
      const list = memoryDB[collectionName];
      const match = list.find((item) => {
        return Object.keys(filter).every((k) => String(item[k]) === String(filter[k]));
      });
      return match ? populateDoc(match, collectionName) : null;
    },

    async findById(id) {
      if (!id) return null;
      const list = memoryDB[collectionName];
      const match = list.find((item) => String(item._id) === String(id));
      if (!match) return null;

      const populated = populateDoc(match, collectionName);
      populated.populate = function (field) {
        return populateDoc(populated, collectionName);
      };
      return populated;
    },

    async create(docData) {
      const newDoc = {
        ...docData,
        _id: docData._id || createId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      memoryDB[collectionName].push(newDoc);
      return populateDoc(newDoc, collectionName);
    },

    async findByIdAndUpdate(id, updateData, options = {}) {
      const list = memoryDB[collectionName];
      const idx = list.findIndex((item) => String(item._id) === String(id));
      if (idx === -1) return null;

      const current = list[idx];
      const updated = {
        ...current,
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      list[idx] = updated;

      const populated = populateDoc(updated, collectionName);
      populated.populate = function () {
        return populateDoc(populated, collectionName);
      };
      return populated;
    },

    async findByIdAndDelete(id) {
      const list = memoryDB[collectionName];
      const idx = list.findIndex((item) => String(item._id) === String(id));
      if (idx === -1) return null;
      const deleted = list.splice(idx, 1)[0];
      return deleted;
    }
  };
}

const MemoryModels = {
  User: createMemoryModel("users"),
  Hospital: createMemoryModel("hospitals"),
  Ambulance: createMemoryModel("ambulances"),
  Emergency: createMemoryModel("emergencies")
};

function isConnected() {
  return isMongoConnected && mongoose.connection.readyState === 1;
}

function setMongoConnected(status) {
  isMongoConnected = status;
}

function getModel(name) {
  if (isConnected()) {
    try {
      return mongoose.model(name);
    } catch {
      return MemoryModels[name];
    }
  }
  return MemoryModels[name];
}

module.exports = {
  isConnected,
  setMongoConnected,
  getModel,
  createId,
  memoryDB
};
