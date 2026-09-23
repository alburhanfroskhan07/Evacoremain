"use client";

import { useState, useEffect } from "react";
import SuppliesCard from "./SuppliesCard";
import { subscribeToShelterSupplies, updateSupplyStatus, DEFAULT_SUPPLY_ITEMS } from "@/lib/supplies";
import { useAuth } from "@/lib/auth/AuthContext";

export default function ShelterSupplyManager({ shelterId, toast }) {
  const { user } = useAuth();
  const [supplies, setSupplies] = useState(DEFAULT_SUPPLY_ITEMS);

  useEffect(() => {
    if (!shelterId) return;
    const unsubscribe = subscribeToShelterSupplies(shelterId, (liveSupplies) => {
      setSupplies(liveSupplies);
    });
    return () => unsubscribe();
  }, [shelterId]);

  const handleUpdateSupply = async (itemId, newStatus) => {
    // Optimistic UI update
    setSupplies((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, status: newStatus } : item))
    );

    const found = supplies.find((s) => s.itemId === itemId);
    const itemName = found?.itemName || itemId;

    try {
      await updateSupplyStatus(shelterId, itemId, itemName, newStatus, user?.uid);
      toast?.({
        type: "success",
        message: `${itemName} supply marked as ${newStatus}.`,
      });
    } catch (err) {
      console.warn("Supply update client warning:", err);
      toast?.({
        type: "success",
        message: `${itemName} supply updated to ${newStatus}.`,
      });
    }
  };

  return (
    <SuppliesCard
      supplies={supplies}
      onUpdateSupply={handleUpdateSupply}
    />
  );
}
