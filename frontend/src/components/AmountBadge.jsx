import React from 'react';

const AmountBadge = ({ amount, currency = 'INR', context = 'neutral' }) => {
  const currencySymbols = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'د.إ',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'C$'
  };

  const symbol = currencySymbols[currency] || currency + ' ';
  const displayAmount = Math.abs(amount).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });

  let colorClass = 'text-text-secondary';
  let badgeBg = 'bg-slate-100';
  
  if (context === 'owed') {
    colorClass = 'text-success';
    badgeBg = 'bg-emerald-50';
  } else if (context === 'owes') {
    colorClass = 'text-danger';
    badgeBg = 'bg-red-50';
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-semibold tabular-nums ${colorClass} ${badgeBg}`}>
      {symbol}{displayAmount}
    </span>
  );
};

export default AmountBadge;
