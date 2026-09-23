import type { ReactElement } from "react";
import { Activity, BarChart3, Database, LayoutDashboard, Settings2 } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface NavigationItem {
  path: string;
  label: string;
  icon: ReactElement;
}

export function AppShell(): ReactElement {
  const { t, i18n } = useTranslation();
  const navigation: NavigationItem[] = [
    { path: "/forecast", label: t("nav.forecast"), icon: <BarChart3 className="h-4 w-4" /> },
    { path: "/data-quality", label: t("nav.dataQuality"), icon: <Database className="h-4 w-4" /> },
    { path: "/calibration", label: t("nav.calibration"), icon: <Settings2 className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <header className="border-b bg-white/90 px-4 py-4 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-cyan-300"><Activity className="h-5 w-5" /></div>
            <div><p className="text-sm font-bold tracking-tight">{t("app.title")}</p><p className="text-xs text-muted-foreground">{t("app.subtitle")}</p></div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="hidden items-center gap-2 md:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("app.apiConnected")}</span>
            <select aria-label={t("languages.label")} className="rounded-lg border bg-white px-2 py-1.5 text-xs font-medium text-slate-700" value={i18n.language} onChange={(event) => { const language = event.target.value; window.localStorage.setItem("windcast-language", language); void i18n.changeLanguage(language); }}>
              <option value="ru">{t("languages.ru")}</option><option value="en">{t("languages.en")}</option><option value="kk">{t("languages.kk")}</option>
            </select>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] gap-6 p-4 sm:p-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <nav className="rounded-2xl border bg-slate-950 p-3 text-slate-300">
            <NavLink to="/forecast" className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isActive ? "bg-white/10 text-white" : "text-slate-400"}`}><LayoutDashboard className="h-4 w-4" /><span>{t("nav.dashboard")}</span></NavLink>
            {navigation.map((item: NavigationItem) => <NavLink key={item.path} to={item.path} className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isActive ? "bg-white/10 text-white" : "text-slate-400"}`}>{item.icon}<span>{item.label}</span></NavLink>)}
          </nav>
          <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("mode.label")}</p><p className="mt-2 font-semibold">{t("mode.value")}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{t("mode.description")}</p></div>
        </aside>
        <main className="min-w-0"><Outlet /></main>
      </div>
    </div>
  );
}
