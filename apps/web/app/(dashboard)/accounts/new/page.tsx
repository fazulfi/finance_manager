import type { Metadata } from "next";
import { AccountForm } from "@/components/accounts/AccountForm";

export const metadata: Metadata = {
  title: "New account",
  description: "Create a new financial account",
};

export default function NewAccountPage(): React.JSX.Element {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
      <AccountForm mode="create" cancelHref="/accounts" />
    </div>
  );
}
