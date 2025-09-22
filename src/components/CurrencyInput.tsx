import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

type Props = {
  value?: string; // backend-format: "4200,00" (string)
  onChange?: (backendValue: string) => void;
  placeholder?: string;
  className?: string;
};

const formatDisplay = (num: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    num
  );

const toBackendString = (num: number) => {
  // returns "4200,00"
  return num.toFixed(2).replace(".", ",");
};

export default function CurrencyInput({
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  // internal shows formatted display like "R$ 4.200,00"
  const [display, setDisplay] = useState("");

  // initialize from backend value (e.g., "4200,00")
  useEffect(() => {
    if (!value) return setDisplay("");
    const normalized = value.replace(/\./g, "").replace(",", "."); // "4200,00" -> "4200.00"
    const n = Number(normalized);
    if (isNaN(n)) return setDisplay("");
    setDisplay(formatDisplay(n));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // keep only digits
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setDisplay("");
      onChange?.("");
      return;
    }
    // interpret last 2 digits as cents
    const asNumber = Number(digits) / 100;
    const formatted = formatDisplay(asNumber);
    setDisplay(formatted);
    onChange?.(toBackendString(asNumber)); // callback gives "4200,00"
  };

  return (
    <Input
      value={display}
      onChange={handleChange}
      placeholder={placeholder ?? "R$ 0,00"}
      className={className}
    />
  );
}
