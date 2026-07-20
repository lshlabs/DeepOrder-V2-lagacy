import type { ComponentProps } from "react";

import { OrderBoard } from "@/features/orders";

type IncomingOrdersPageProps = ComponentProps<typeof OrderBoard>;

export function IncomingOrdersPage(props: IncomingOrdersPageProps) {
  return <OrderBoard {...props} />;
}
