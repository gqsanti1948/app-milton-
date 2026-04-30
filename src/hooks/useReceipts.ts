import { useState, useCallback } from 'react';
import { Receipt } from '../types';
import { getReceipts, saveReceipts } from '../utils/storage';

export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>(() => getReceipts());

  const refresh = useCallback(() => {
    setReceipts(getReceipts());
  }, []);

  const addReceipt = useCallback((receipt: Receipt) => {
    setReceipts((prev) => {
      const updated = [...prev, receipt];
      saveReceipts(updated);
      return updated;
    });
  }, []);

  const getReceiptsByPatient = useCallback(
    (patientId: string): Receipt[] => {
      return receipts.filter((r) => r.patientId === patientId);
    },
    [receipts]
  );

  const getNextReceiptNumber = useCallback((): string => {
    const currentYear = new Date().getFullYear();
    const thisYearReceipts = receipts.filter((r) =>
      r.receiptNumber.startsWith(`REC-${currentYear}-`)
    );

    let maxNum = 0;
    thisYearReceipts.forEach((r) => {
      const parts = r.receiptNumber.split('-');
      const num = parseInt(parts[2] || '0', 10);
      if (num > maxNum) maxNum = num;
    });

    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    return `REC-${currentYear}-${nextNum}`;
  }, [receipts]);

  return { receipts, addReceipt, getReceiptsByPatient, getNextReceiptNumber, refresh };
}
