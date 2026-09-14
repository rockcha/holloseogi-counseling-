import { AuthStoryCopy } from "./auth-story-copy";
import { createContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Clock3 } from "lucide-react";
import {
  supabase,
  supabaseConfigError,
  supabaseConfigured,
} from "@/lib/supabase";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Profile = { id: string; name: string; is_teacher: boolean };
export const MemberProfileContext = createContext<Profile | null>(null);
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next);
        setLoading(false);
      }
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active) {
          setSession(data.session);
          setLoading(false);
          if (error)
            setError(
              "로그인 정보를 확인하지 못했습니다. 다시 로그인해 주세요.",
            );
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setError("인증 서버에 연결하지 못했습니다. 새로고침해 주세요.");
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    if (profile?.id !== userId) setProfileLoading(true);
    setProfileError("");
    Promise.resolve(
      supabase
        .from("profiles")
        .select("id,name,is_teacher")
        .eq("id", userId)
        .single(),
    )
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setProfile(null);
          setProfileError(
            "회원 정보를 확인하지 못했습니다. 다시 확인하거나 관리자에게 문의해 주세요.",
          );
        } else setProfile(data as Profile);
        setProfileLoading(false);
      })
      .catch(() => {
        if (active) {
          setProfile(null);
          setProfileLoading(false);
          setProfileError("서버에 연결하지 못했습니다. 다시 확인해 주세요.");
        }
      });
    return () => {
      active = false;
    };
  }, [userId, refresh]);
  useEffect(() => {
    if (!userId) return;
    const check = () => setRefresh((n) => n + 1);
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [userId]);
  if (!supabaseConfigured) return children;
  if (supabaseConfigError)
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div role="alert" className="panel p-8">
          {supabaseConfigError}
          <p className="subtext mt-3">
            .env.local을 수정한 뒤 개발 서버를 재시작해 주세요.
          </p>
        </div>
      </div>
    );
  if (loading)
    return (
      <p className="p-10 text-center" role="status">
        로그인 정보를 확인하고 있습니다…
      </p>
    );
  if (session) {
    if (profileLoading)
      return (
        <p className="p-10 text-center" role="status">
          회원 정보를 확인하고 있습니다…
        </p>
      );
    if (profile && profile.id === userId && profile.is_teacher === true)
      return (
        <MemberProfileContext.Provider value={profile}>
          <div key={session.user.id}>{children}</div>
        </MemberProfileContext.Provider>
      );
    return (
      <main className="min-h-screen grid place-items-center p-5">
        <section className="panel approval-card w-full max-w-md p-8 text-center">
          <BrandLogo className="approval-logo" />
          <Clock3 className="mx-auto mb-5 text-primary" size={36} />
          <h1 className="text-2xl mb-3">
            {profileError
              ? "회원 정보 확인이 필요해요"
              : "관리자 승인을 기다리고 있어요"}
          </h1>
          <p className="text-sm leading-7 text-muted-foreground">
            {profileError ||
              `${profile?.name || "회원"}님, 가입을 환영합니다. 관리자가 선생님 계정을 승인하면 상담관리 기능을 사용할 수 있습니다.`}
          </p>
          {error && (
            <p role="alert" className="text-destructive text-sm mt-3">
              {error}
            </p>
          )}
          <div className="flex justify-center gap-2 mt-6">
            <Button onClick={() => setRefresh((n) => n + 1)}>
              승인 상태 다시 확인
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!supabase) return;
                const { error } = await supabase.auth.signOut();
                if (error)
                  setError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
              }}
            >
              로그아웃
            </Button>
          </div>
        </section>
      </main>
    );
  }
  return (
    <main className="auth-page">
      <div className="auth-layout">
        <aside className="auth-story">
          <p className="auth-kicker">HOLLOSEOGI · COUNSELING</p>
          <div className="auth-logo-stage">
            <BrandLogo className="auth-hero-logo" />
          </div>
          <AuthStoryCopy />
        </aside>
        <section className="auth-form-panel">
          <h1 className="auth-form-title">{signup ? "회원가입" : "로그인"}</h1>
          <form
            key={String(signup)}
            className="grid gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || !supabase) return;
              const form = new FormData(e.currentTarget);
              const name = String(form.get("name") ?? "").trim();
              const email = String(form.get("email")).trim();
              const password = String(form.get("password"));
              setError("");
              if (signup && !name) {
                setError("실명을 입력해 주세요.");
                return;
              }
              if (signup && password !== form.get("confirm")) {
                setError("비밀번호가 일치하지 않습니다.");
                return;
              }
              setBusy(true);
              try {
                if (signup) {
                  const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { name } },
                  });
                  if (error)
                    setError(
                      error.code === "user_already_exists"
                        ? "이미 가입된 이메일입니다. 로그인해 주세요."
                        : error.code === "weak_password"
                          ? "비밀번호가 보안 조건을 충족하지 않습니다. 다른 비밀번호를 사용해 주세요."
                          : "가입하지 못했습니다. 잠시 후 다시 시도해 주세요. (" + (error.code || "unknown_error") + ")",
                    );
                  else if (!data.session) {
                    setError(
                      "가입 후 로그인을 완료하지 못했습니다. 기존 계정이라면 로그인해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.",
                    );
                  } else {
                    setSession(data.session);
                  }
                } else {
                  const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                  });
                  if (error)
                    setError(
                      "로그인하지 못했습니다. 이메일과 비밀번호를 확인해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.",
                    );
                }
              } catch {
                setError(
                  "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {signup && (
              <label className="field">
                이름 (실명)
                <Input
                  name="name"
                  required
                  maxLength={50}
                  autoComplete="name"
                  placeholder="실명을 입력해 주세요"
                />
              </label>
            )}
            <label className="field">
              이메일
              <Input
                type="email"
                name="email"
                required
                autoComplete="username"
                placeholder="teacher@example.com"
              />
            </label>
            <label className="field">
              비밀번호
              <Input
                type="password"
                name="password"
                required
                minLength={signup ? 8 : undefined}
                autoComplete={signup ? "new-password" : "current-password"}
                placeholder={
                  signup ? "8자 이상 입력해 주세요" : "비밀번호를 입력해 주세요"
                }
              />
            </label>
            {signup && (
              <label className="field">
                비밀번호 확인
                <Input
                  type="password"
                  name="confirm"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="비밀번호를 한 번 더 입력해 주세요"
                />
              </label>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button disabled={busy} className="auth-submit">
              {busy ? "처리 중…" : signup ? "회원가입" : "로그인"}
            </Button>
          </form>
          <div className="auth-switch">
            {signup ? "이미 계정이 있으신가요?" : "아직 계정이 없으신가요?"}{" "}
            <button
              className="text-primary font-semibold underline underline-offset-4 ml-1 py-2"
              disabled={busy}
              onClick={() => {
                setSignup(!signup);
                setError("");
              }}
            >
              {signup ? "로그인" : "회원가입"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
