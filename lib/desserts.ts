import type { Dessert } from "./types";

export const DESSERT_PRICE = 10000;

export const DESSERTS: Dessert[] = [
  {
    id: 1,
    name: "Arequipe",
    description: "Postre suave, dulce y cremoso, ideal para celebraciones o antojos especiales.",
    price: DESSERT_PRICE,
    imageUrl: "/images/publicidad.jpg",
    active: true
  },
  {
    id: 2,
    name: "Mora",
    description: "Postre fresco con salsa de mora artesanal y una textura cremosa irresistible.",
    price: DESSERT_PRICE,
    imageUrl: "/images/mora.jpg",
    active: true
  },
  {
    id: 3,
    name: "Maracuya",
    description: "Sabor tropical con pulpa de maracuya, dulce y ligeramente acido.",
    price: DESSERT_PRICE,
    imageUrl: "/images/maracuya.jpg",
    active: true
  },
  {
    id: 4,
    name: "Oreo",
    description: "Base cremosa con trozos de galleta Oreo para quienes aman el chocolate.",
    price: DESSERT_PRICE,
    imageUrl: "/images/oreo.jpg",
    active: true
  },
  {
    id: 5,
    name: "Limon",
    description: "Postre fresco y cremoso con ralladura de limon, perfecto para dias calidos.",
    price: DESSERT_PRICE,
    imageUrl: "/images/limon.jpg",
    active: true
  },
  {
    id: 6,
    name: "Leche Klim",
    description:
      "Postre cremoso con base crocante de galletas ducales, nuestra mezcla especial, leche klim y sabor equilibrado.",
    price: DESSERT_PRICE,
    imageUrl: "/images/leche-klim.png",
    active: true
  }
];

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value);
}
