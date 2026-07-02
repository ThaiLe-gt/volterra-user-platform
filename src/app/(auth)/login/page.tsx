import { LoginForm } from "@/features/auth";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/login-city-bg.png')] bg-cover bg-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(47,128,237,0.18),transparent_34%),linear-gradient(180deg,rgba(5,9,16,0.52),rgba(5,9,16,0.86))]"
      />
      <LoginForm />
    </div>
  );
}
