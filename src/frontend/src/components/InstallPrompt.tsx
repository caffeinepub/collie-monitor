import { Button } from "@/components/ui/button";
import { Download, Plus, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    // Already installed as standalone — show nothing
    if (isStandalone()) return;

    const dismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    if (isIOS()) {
      setShowIOS(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroid(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("[PWA] Install outcome:", outcome);
    setDeferredPrompt(null);
    setShowAndroid(false);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  const handleDismiss = () => {
    setShowAndroid(false);
    setShowIOS(false);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  // ── Android / Desktop banner (top) ──────────────────────────────────────
  if (showAndroid) {
    return (
      <div
        data-ocid="pwa.panel"
        className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628] border-b-2 border-cyan-400 text-cyan-400 shadow-lg"
      >
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Download className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-mono">
              Instale o Collie Monitor para acesso nativo sem browser
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              data-ocid="pwa.primary_button"
              onClick={handleInstallClick}
              size="sm"
              className="bg-cyan-400 text-[#0a1628] hover:bg-cyan-300 font-mono font-semibold"
            >
              Instalar
            </Button>
            <Button
              data-ocid="pwa.close_button"
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── iOS bottom drawer ────────────────────────────────────────────────────
  if (showIOS) {
    return (
      <div
        data-ocid="pwa.panel"
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a1628] border-t-2 border-cyan-400 rounded-t-2xl text-cyan-400 shadow-2xl"
      >
        <div className="px-5 pt-5 pb-8">
          {/* Handle bar */}
          <div className="w-10 h-1 rounded-full bg-cyan-400/40 mx-auto mb-5" />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <img
                src="/assets/generated/apple-touch-icon.dim_180x180.png"
                alt="Collie Monitor"
                className="w-10 h-10 rounded-xl"
              />
              <div>
                <p className="font-mono font-bold text-cyan-300 text-base leading-tight">
                  Collie Monitor
                </p>
                <p className="font-mono text-xs text-cyan-400/70">
                  Instalar no iPhone
                </p>
              </div>
            </div>
            <Button
              data-ocid="pwa.close_button"
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 -mr-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Steps */}
          <ol className="space-y-3 font-mono text-sm">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-400/20 border border-cyan-400/50 flex items-center justify-center text-xs font-bold text-cyan-300">
                1
              </span>
              <span className="text-cyan-100 leading-snug">
                Toque no ícone{" "}
                <Share className="inline h-4 w-4 text-cyan-400 mx-0.5" />{" "}
                <strong className="text-cyan-300">Compartilhar</strong>{" "}
                (quadrado com seta) na barra inferior do Safari
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-400/20 border border-cyan-400/50 flex items-center justify-center text-xs font-bold text-cyan-300">
                2
              </span>
              <span className="text-cyan-100 leading-snug">
                Role para baixo e toque em{" "}
                <strong className="text-cyan-300">
                  "Adicionar à Tela de Início"
                </strong>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-400/20 border border-cyan-400/50 flex items-center justify-center text-xs font-bold text-cyan-300">
                3
              </span>
              <span className="text-cyan-100 leading-snug">
                Toque em <strong className="text-cyan-300">"Adicionar"</strong>{" "}
                no canto superior direito{" "}
                <Plus className="inline h-4 w-4 text-cyan-400" />
              </span>
            </li>
          </ol>

          <p className="mt-4 text-xs text-cyan-400/50 font-mono text-center">
            O app será instalado na sua tela de início sem precisar do browser
          </p>
        </div>
      </div>
    );
  }

  return null;
}
