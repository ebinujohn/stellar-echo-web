import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Stellar Echo</h1>
          <p className="mt-2 text-muted-foreground">
            Voice AI Agent Management Platform
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
