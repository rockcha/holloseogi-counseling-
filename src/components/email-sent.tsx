import { Check } from "lucide-react";
import { BrandLogo } from "./brand-logo";

export function EmailSent({ email }: { email: string }) {
  return (
    <main className="auth-page">
      <section className="email-sent-card" aria-labelledby="email-sent-title">
        <BrandLogo className="approval-logo" />
        <h1 id="email-sent-title" className="text-2xl sm:text-3xl">인증 이메일을 보냈어요</h1>
        <p role="status" className="mt-5 text-sm leading-7 text-muted-foreground">
          <strong className="block break-all text-base text-foreground">{email}</strong>
          받은 이메일의 인증 링크를 눌러<br />회원가입을 이어서 완료해 주세요.
        </p>
        <ol className="email-sent-steps" aria-label="회원가입 진행 단계">
          <li><span><Check size={15} aria-hidden="true" /></span>가입 신청</li>
          <li aria-current="step"><span>2</span>이메일 인증</li>
          <li><span>3</span>관리자 승인</li>
        </ol>
      </section>
    </main>
  );
}
