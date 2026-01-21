export type Drug = {
  id: string;
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
  serviceId: string;
  date: string;
  userId: string;
  lotNumber?: string;
};
