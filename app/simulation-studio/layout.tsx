import { LabShell } from "../../components/lab-shell";

export default function SimulationStudioLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <LabShell>{children}</LabShell>;
}
