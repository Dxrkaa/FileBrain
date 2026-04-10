import { useState, useEffect } from "react";
import { Router, Route, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { LanguageProvider } from "@/i18n";
import { Layout } from "@/components/Layout";
import { Setup } from "@/pages/Setup";
import { Dashboard } from "@/pages/Dashboard";
import { Files } from "@/pages/Files";
import { FileDetail } from "@/pages/FileDetail";
import { Search } from "@/pages/Search";
import { Graph } from "@/pages/Graph";
import { Brain, Loader2 } from "lucide-react";

type AppState = "loading" | "setup" | "app";

export default function App() {
  const [state, setState] = useState<AppState>("loading");

  useEffect(() => {
    async function init() {
      if (window.electron) {
        const done = await window.electron.isSetupComplete();
        setState(done ? "app" : "setup");
      } else {
        setState("app");
      }
    }
    init();
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#f8fafc]">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (state === "setup") {
    return (
      <LanguageProvider>
        <Setup onComplete={() => setState("app")} />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <Router hook={useHashLocation}>
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/files/:id" component={FileDetail} />
            <Route path="/files" component={Files} />
            <Route path="/search" component={Search} />
            <Route path="/graph" component={Graph} />
            <Route component={Dashboard} />
          </Switch>
        </Layout>
      </Router>
    </LanguageProvider>
  );
}
