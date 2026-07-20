import type { ComponentProps } from "react";

import { StatsPanel } from "@/features/stats";

type StatsPageProps = ComponentProps<typeof StatsPanel>;

export function StatsPage(props: StatsPageProps) {
  return <StatsPanel {...props} />;
}
