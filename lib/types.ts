export type Dessert = {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  active: boolean;
};

export type OrderForm = {
  fullName: string;
  documentNumber: string;
  phone: string;
  email: string;
  deliveryAddress: string;
  observations: string;
  website: string;
};

export type CartItem = {
  dessertId: number;
  quantity: number;
};

export type AdminOrderItem = {
  id: number;
  dessert_id: number;
  dessert_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
};

export type AdminOrder = {
  id: number;
  customer_id: number;
  delivery_address: string;
  delivery_date: string | null;
  observations: string | null;
  total_amount: number;
  status: string;
  payment_method: string | null;
  admin_notes: string | null;
  created_at: string;
  customers: {
    id: number;
    document_number: string;
    full_name: string;
    email: string;
    phone: string;
  } | null;
  order_items: AdminOrderItem[];
};

export type SalesSummaryItem = {
  dessert_id: number;
  dessert_name: string;
  total_quantity: number;
  total_sold: number;
};
