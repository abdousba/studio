'use server';

import { google } from 'googleapis';
import type { Drug, Service, Distribution } from '@/lib/types';

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function getSheetsClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!privateKey || !clientEmail || !SHEET_ID) {
    throw new Error('Les informations d\'identification du compte de service Google ou l\'ID de la feuille ne sont pas définis dans .env');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

async function fetchData(range: string): Promise<any[][]> {
    if (!SHEET_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        console.warn(`L'intégration de Google Sheets n'est pas configurée. Données de démonstration utilisées. Veuillez consulter le README pour configurer l'intégration.`);
        return [];
    }
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range,
        });
        return response.data.values || [];
    } catch (error) {
        console.error(`Erreur lors de la récupération des données de Google Sheet (plage: ${range}):`, error);
        throw new Error(`Impossible de récupérer les données pour la plage ${range}. Assurez-vous que l'API Google Sheets est activée et que la feuille est partagée avec l'e-mail du compte de service.`);
    }
}


function mapRowToHeaders(row: any[], headers: string[]) {
    const obj: { [key: string]: any } = {};
    headers.forEach((header, i) => {
        obj[header] = row[i];
    });
    return obj;
}


export async function getDrugs(): Promise<Drug[]> {
    const values = await fetchData('Médicaments!A1:E');
    if (!values || values.length < 2) return [];

    const headers = values[0];
    const rows = values.slice(1);
    
    return rows.map(row => {
        const drugData = mapRowToHeaders(row, headers);
        return {
            barcode: drugData.barcode || '',
            designation: drugData.designation || '',
            currentStock: parseInt(drugData.currentStock, 10) || 0,
            expiryDate: drugData.expiryDate || '',
            lowStockThreshold: parseInt(drugData.lowStockThreshold, 10) || 0,
        };
    }).filter(d => d.barcode);
}

export async function getServices(): Promise<Service[]> {
    const values = await fetchData('Services!A1:B');
    if (!values || values.length < 2) return [];

    const headers = values[0];
    const rows = values.slice(1);

    return rows.map(row => {
        const serviceData = mapRowToHeaders(row, headers);
        return {
            id: serviceData.id || '',
            name: serviceData.name || '',
        };
    }).filter(s => s.id);
}

export async function getDistributions(): Promise<Distribution[]> {
     const values = await fetchData('Distributions!A1:F');
    if (!values || values.length < 2) return [];

    const headers = values[0];
    const rows = values.slice(1);

    return rows.map(row => {
        const distData = mapRowToHeaders(row, headers);
        return {
            id: distData.id || '',
            barcode: distData.barcode || '',
            itemName: distData.itemName || '',
            quantityDistributed: parseInt(distData.quantityDistributed, 10) || 0,
            service: distData.service || '',
            date: distData.date || '',
        };
    }).filter(d => d.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
