import type { Dessert } from "./types";

export const DESSERT_PRICE = 10000;

export const DESSERTS: Dessert[] = [
  {
    id: 1,
    name: "Arequipe",
    description:
      "Capas de arequipe casero que se derriten en la boca sobre una crema suave y sedosa. Dulce, envolvente y perfecto para consentirte.",
    price: DESSERT_PRICE,
    imageUrl: "/images/arequipe.jpg",
    active: true
  },
  {
    id: 2,
    name: "Mora",
    description:
      "Salsa de mora natural con ese punto agridulce que despierta el paladar, sobre una crema fresca e irresistible. Un antojo que no falla.",
    price: DESSERT_PRICE,
    imageUrl: "/images/mora.jpg",
    active: true
  },
  {
    id: 3,
    name: "Maracuya",
    description:
      "El sabor tropical de la maracuyá con su pulpa fresca y vibrante, entre dulce y ácido, para un postre que sabe a vacaciones.",
    price: DESSERT_PRICE,
    imageUrl: "/images/maracuya.jpg",
    active: true
  },
  {
    id: 4,
    name: "Oreo",
    description:
      "Crema aterciopelada cargada de trozos de galleta Oreo en cada cucharada. El favorito de los amantes del chocolate y la galleta.",
    price: DESSERT_PRICE,
    imageUrl: "/images/oreo.jpg",
    active: true
  },
  {
    id: 5,
    name: "Limon",
    description:
      "Fresco, cremoso y con la chispa cítrica de la ralladura de limón. Ligero y refrescante, el bocado ideal para cualquier momento.",
    price: DESSERT_PRICE,
    imageUrl: "/images/limon.jpg",
    active: true
  },
  {
    id: 6,
    name: "Leche Klim",
    description:
      "Nuestra receta estrella: base crocante de galleta ducales, crema especial y el inconfundible sabor de la leche Klim. Puro capricho casero.",
    price: DESSERT_PRICE,
    imageUrl: "/images/leche-klim.png",
    active: true
  },
  {
    id: 7,
    name: "Chocolate",
    description:
      "Nuestro nuevo sabor: chocolate intenso y cremoso que se funde en cada cucharada. Profundo, sedoso y adictivo para los verdaderos chocolovers.",
    price: DESSERT_PRICE,
    imageUrl: "",
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
