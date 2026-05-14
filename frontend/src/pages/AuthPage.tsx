import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth-store";

type Mode = "register" | "login";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const register = useAuthStore((state) => state.register);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);

  const title = useMemo(() => (mode === "register" ? "创建你的学习账号" : "登录继续学习"), [mode]);

  async function handleSubmit() {
    setMessage("");
    setErrorMessage("");
    try {
      if (mode === "register") {
        await register(username, password);
        setMessage("注册成功，请使用刚刚创建的账号登录。");
        setMode("login");
        setPassword("");
        return;
      }
      await login(username, password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="grid w-full max-w-6xl gap-6 lg:gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden">
          <CardContent className="flex h-full flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted">LumaLex Account</p>
              <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
                先登录你的账号，再进入完整的背词学习系统。
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
                账号系统现在是应用的底层能力。系统词库由所有用户共享，自定义词库、学习进度、复习计划和统计数据都会严格归属于当前账号。
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">系统词库</p>
                <p className="mt-3 text-lg font-semibold">共享内容</p>
                <p className="mt-2 text-sm text-muted-foreground">所有用户使用同一套预设词库。</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">自定义词库</p>
                <p className="mt-3 text-lg font-semibold">按账号归属</p>
                <p className="mt-2 text-sm text-muted-foreground">你的自建词库只属于你自己，不与其他账号混用。</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-panel/60 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">学习数据</p>
                <p className="mt-3 text-lg font-semibold">隔离保存</p>
                <p className="mt-2 text-sm text-muted-foreground">学习记录、复习记录、统计和设置都会独立保存。</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mx-auto w-full max-w-xl">
          <CardHeader className="p-6 sm:p-8">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-panel p-1">
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "register" ? "bg-white text-slate-950" : "text-muted-foreground"
                }`}
              >
                注册
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "login" ? "bg-white text-slate-950" : "text-muted-foreground"
                }`}
              >
                登录
              </button>
            </div>
            <CardTitle className="pt-4">{title}</CardTitle>
            <CardDescription>
              {mode === "register"
                ? "首次进入请先注册账号。只需要账号和密码，即可开始使用。"
                : "登录后才能正式进入应用，系统会自动加载你的词库和学习进度。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-6 pt-0 sm:p-8 sm:pt-0">
            {(message || errorMessage) && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  errorMessage
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                }`}
              >
                {errorMessage || message}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">账号</label>
              <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="请输入账号名" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位密码"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSubmit();
                }}
              />
            </div>

            <Button className="w-full" onClick={() => void handleSubmit()} disabled={loading}>
              {loading ? "处理中..." : mode === "register" ? "注册账号" : "登录进入应用"}
            </Button>

            <p className="text-sm leading-6 text-muted-foreground">
              {mode === "register"
                ? "注册完成后会自动回到登录模式。新账号初始没有任何自定义词库，需要你自己创建。"
                : "如果还没有账号，请切换到注册模式先创建一个。"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
