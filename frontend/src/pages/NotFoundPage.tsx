import { ArrowLeft, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="space-y-6 p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">404 · 页面未找到</p>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">这个学习页面不存在或已经移动。</h1>
          <p className="max-w-prose text-sm leading-7 text-muted-foreground">
            你的本地词库和学习记录没有受到影响。返回首页后可以继续学习、复习或管理词库。
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/" className={cn(buttonVariants(), "w-full sm:w-auto")}>
            <Home className="h-4 w-4" />
            返回首页
          </Link>
          <button type="button" className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")} onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            返回上一页
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
