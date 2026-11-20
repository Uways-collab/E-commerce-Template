"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface DrawerLine {
  variantId: string;
  name: string;
  slug: string;
  image: string | null;
  size: string | null;
  colorName: string | null;
  colorHex: string | null;
  quantity: number;
  stock: number;
  unitPriceLabel: string;
  lineTotalLabel: string;
}

export interface DrawerTotals {
  subtotalLabel: string;
  discountLabel: string | null;
  shippingLabel: string;
  totalLabel: string;
  freeShippingRemainingLabel: string | null;
  freeShippingProgress: number;
  couponCode: string | null;
  couponError: string | null;
  deliveryLabel: string;
}

export interface CartSnapshot {
  itemCount: number;
  lines: DrawerLine[];
  totals: DrawerTotals;
}

interface CartContextValue {
  itemCount: number;
  isOpen: boolean;
  snapshot: CartSnapshot | null;
  loading: boolean;
  flash: { message: string; tone: "success" | "error" } | null;
  openCart: () => void;
  closeCart: () => void;
  refresh: () => Promise<void>;
  setItemCount: (count: number) => void;
  notify: (message: string, tone?: "success" | "error") => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  initialItemCount,
  children,
}: {
  initialItemCount: number;
  children: React.ReactNode;
}) {
  const [itemCount, setItemCount] = useState(initialItemCount);
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<CartSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/cart", { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as CartSnapshot;
        setSnapshot(data);
        setItemCount(data.itemCount);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const notify = useCallback((message: string, tone: "success" | "error" = "success") => {
    setFlash({ message, tone });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 4200);
  }, []);

  const openCart = useCallback(() => {
    setIsOpen(true);
    void refresh();
  }, [refresh]);

  const closeCart = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  const value = useMemo(
    () => ({
      itemCount,
      isOpen,
      snapshot,
      loading,
      flash,
      openCart,
      closeCart,
      refresh,
      setItemCount,
      notify,
    }),
    [itemCount, isOpen, snapshot, loading, flash, openCart, closeCart, refresh, notify],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
