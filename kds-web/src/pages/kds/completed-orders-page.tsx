import type { ComponentProps } from "react";

import { OrderBoard } from "@/features/orders";

type CompletedOrdersPageProps = ComponentProps<typeof OrderBoard>;

export function CompletedOrdersPage(props: CompletedOrdersPageProps) {
  return <OrderBoard {...props} />;
}
