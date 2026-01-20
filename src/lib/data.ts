export type Drug = {
  barcode: string;
  designation: string;
  currentStock: number;
  expiryDate: string;
  lowStockThreshold: number;
};

export type Service = {
  id: string;
  name: string;
};

export type Distribution = {
  id: string;
  barcode: string;
  itemName: string;
  quantityDistributed: number;
  service: string;
  date: string;
};

export const drugs: Drug[] = [
  { barcode: '8901043011333', designation: 'Paracetamol 500mg', currentStock: 250, expiryDate: '2025-12-31', lowStockThreshold: 50 },
  { barcode: '8901296043232', designation: 'Amoxicillin 250mg', currentStock: 45, expiryDate: '2024-09-30', lowStockThreshold: 50 },
  { barcode: '8901135230018', designation: 'Ibuprofen 200mg', currentStock: 300, expiryDate: '2026-06-30', lowStockThreshold: 100 },
  { barcode: '8904091102029', designation: 'Cetirizine 10mg', currentStock: 150, expiryDate: '2024-08-15', lowStockThreshold: 30 },
  { barcode: '8906009400249', designation: 'Aspirin 75mg', currentStock: 180, expiryDate: '2025-05-20', lowStockThreshold: 40 },
  { barcode: '8901799002131', designation: 'Metformin 500mg', currentStock: 120, expiryDate: '2026-01-10', lowStockThreshold: 25 },
  { barcode: '8901088102345', designation: 'Omeprazole 20mg', currentStock: 90, expiryDate: '2024-11-01', lowStockThreshold: 30 },
];

export const services: Service[] = [
  { id: 'emergency', name: 'Emergency' },
  { id: 'surgery', name: 'Surgery' },
  { id: 'pediatrics', name: 'Pediatrics' },
  { id: 'cardiology', name: 'Cardiology' },
  { id: 'oncology', name: 'Oncology' },
  { id: 'internal_medicine', name: 'Internal Medicine' },
];

export const distributions: Distribution[] = [
  { id: 'dist_1', barcode: '8901043011333', itemName: 'Paracetamol 500mg', quantityDistributed: 20, service: 'Emergency', date: '2024-07-20' },
  { id: 'dist_2', barcode: '8901296043232', itemName: 'Amoxicillin 250mg', quantityDistributed: 15, service: 'Pediatrics', date: '2024-07-19' },
  { id: 'dist_3', barcode: '8901135230018', itemName: 'Ibuprofen 200mg', quantityDistributed: 30, service: 'Surgery', date: '2024-07-19' },
  { id: 'dist_4', barcode: '8906009400249', itemName: 'Aspirin 75mg', quantityDistributed: 10, service: 'Cardiology', date: '2024-07-18' },
  { id: 'dist_5', barcode: '8901043011333', itemName: 'Paracetamol 500mg', quantityDistributed: 25, service: 'Internal Medicine', date: '2024-07-18' },
];
