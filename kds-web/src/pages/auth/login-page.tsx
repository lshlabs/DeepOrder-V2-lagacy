import { LoginForm, type LoginFormProps } from "@/features/auth";

export function LoginPage(props: LoginFormProps) {
  return <LoginForm {...props} />;
}
