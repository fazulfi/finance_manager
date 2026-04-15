import type { Metadata } from "next";

import SignupForm from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your free Finance Manager Pro account. No credit card required.",
};

export default function SignupPage() {
  return <SignupForm />;
}
