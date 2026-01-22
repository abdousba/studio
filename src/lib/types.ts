export type Drug = {
  id: string;
  barcode: string;
  designation: string;
  initialStock?: number;
  currentStock: number;
  expiryDate: string;
  lowStockThreshold: number;
  lotNumber?: string;
  category?: string;
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
