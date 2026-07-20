import { ChefHat } from "lucide-react";

export function AuthHero() {
  return (
    <section className="auth-hero" aria-hidden="true">
      <div className="auth-hero-top">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <ChefHat size={16} aria-hidden="true" />
          </div>
          <span className="auth-brand-name">DeepOrder KDS</span>
        </div>

        <div className="auth-hero-headline">
          <h1>
            주방을 더
            <br />
            스마트하게
          </h1>
          <p>실시간 주문 접수부터 AI 분석까지. 매장 운영에 꼭 필요한 것만 담았습니다.</p>
        </div>
      </div>

      <p className="auth-hero-footer">© 2025 DeepOrder. All rights reserved.</p>
    </section>
  );
}
