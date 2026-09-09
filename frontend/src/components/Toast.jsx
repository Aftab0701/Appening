import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export default function Toast({ toast, onDismiss }) {
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!toast) return;
    const handle = setTimeout(() => onDismiss(), 3800);
    return () => clearTimeout(handle);
  }, [toast, onDismiss]);

  useGSAP(() => {
    if (!toast || !wrapRef.current) return;
    gsap.fromTo(
      wrapRef.current,
      { y: -14, scale: 0.96, opacity: 0, x: "-50%" },
      { y: 0, scale: 1, opacity: 1, x: "-50%", duration: 0.4, ease: "back.out(1.4)" }
    );
  }, { dependencies: [toast?.key], scope: wrapRef });

  if (!toast) return null;

  return (
    <div className="sb-toast-anchor" ref={wrapRef}>
      <div className={`sb-toast ${toast.type}`}>
        <span>{toast.message}</span>
        <button onClick={onDismiss} aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
