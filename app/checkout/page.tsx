'use client';

import { Suspense } from "react";
import CheckoutPageContent from "./CheckoutPageContent";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="text-white mt-20">Loading checkout...</div>}>
      <CheckoutPageContent />
    </Suspense>
  );
}
