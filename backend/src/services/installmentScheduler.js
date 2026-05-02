import { addMonthsKeepingDay } from '../utils/dateUtils.js';
import { splitAmount } from '../utils/money.js';

export function buildInstallmentSchedule({ totalAmount, installments, firstDueDate, carneId }) {
  const amounts = splitAmount(totalAmount, installments);

  return amounts.map((amount, index) => ({
    installmentNumber: index + 1,
    dueDate: addMonthsKeepingDay(firstDueDate, index),
    amount,
    seuNumero: `${carneId}-${String(index + 1).padStart(2, '0')}`
  }));
}
