import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { drugs, type Drug } from "@/lib/data";

function getStockStatus(drug: Drug): {
  label: "In Stock" | "Low Stock" | "Expired";
  variant: "default" | "destructive" | "secondary";
} {
  const expiryDate = new Date(drug.expiryDate);
  if (expiryDate < new Date()) {
    return { label: "Expired", variant: "destructive" };
  }
  if (drug.currentStock < drug.lowStockThreshold) {
    return { label: "Low Stock", variant: "secondary" };
  }
  return { label: "In Stock", variant: "default" };
}

export default function InventoryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Drug Inventory</CardTitle>
        <CardDescription>
          A comprehensive list of all drugs currently in the pharmacy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                Status
              </TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead className="hidden md:table-cell">Current Stock</TableHead>
              <TableHead>Expiry Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {drugs.map((drug) => {
              const status = getStockStatus(drug);
              return (
                <TableRow key={drug.barcode}>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={status.variant} className={status.variant === 'default' ? 'bg-green-100 text-green-800' : ''}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {drug.designation}
                  </TableCell>
                  <TableCell>{drug.barcode}</TableCell>
                  <TableCell className="hidden md:table-cell">{drug.currentStock}</TableCell>
                  <TableCell>{drug.expiryDate}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
