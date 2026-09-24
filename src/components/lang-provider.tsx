"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SECOND_LANG_COOKIE, type SecondLang } from "@/lib/lang";

type LangContextValue = {
  l2: SecondLang;
  setL2: (lang: SecondLang) => void;
};

const LangContext = createContext<LangContextValue>({ l2: "hi", setL2: () => {} });

export function LangProvider({ initial, children }: { initial: SecondLang; children: React.ReactNode }) {
  const [l2, setState] = useState<SecondLang>(initial);
  const router = useRouter();

  useEffect(() => {
    document.documentElement.dataset.l2 = l2;
  }, [l2]);

  const setL2 = useCallback(
    (lang: SecondLang) => {
      document.cookie = `${SECOND_LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
      setState(lang);
      // Server components read the cookie, so re-render them in the new language.
      router.refresh();
    },
    [router],
  );

  return <LangContext.Provider value={{ l2, setL2 }}>{children}</LangContext.Provider>;
}

export function useSecondLang() {
  return useContext(LangContext);
}
