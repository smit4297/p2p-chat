// Copy to clipboard hook with feedback

import { useState, useCallback } from "react";

export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (!navigator?.clipboard) {
      console.warn("Clipboard not supported");
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setIsCopied(true);

      // Reset after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);

      return true;
    } catch (error) {
      console.error("Failed to copy:", error);
      setCopiedText(null);
      setIsCopied(false);
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setCopiedText(null);
    setIsCopied(false);
  }, []);

  return {
    copy,
    copiedText,
    isCopied,
    reset,
  };
}
