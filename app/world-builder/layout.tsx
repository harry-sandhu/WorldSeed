import { LabShell } from "../../components/lab-shell";

export default function WorldBuilderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <LabShell>{children}</LabShell>;
}
