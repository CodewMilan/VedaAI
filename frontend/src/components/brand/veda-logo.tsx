import * as React from "react";
import { cn } from "@/lib/utils";

interface VedaLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

/**
 * VedaAI brand mark — orange-gradient rounded square with the white "V"
 * vector lifted directly from Figma node 2:10591.
 *
 * The background (Figma node 2:10592) is a two-stop linear gradient
 * (#e56820 → #d45e3e) with the brand grain JPEG layered on top.
 * Texture transforms (w-290.14 %, h-162.5 %, left-[-21.2 %], top-[-33.02 %])
 * are copied verbatim from the Figma frame so the visible portion of the
 * grain matches exactly.
 *
 * viewBox is trimmed tightly to the V bounding box (25.7143 12.8571 28 19.42)
 * so the shape fills 70 % of the container width — matching Figma's spec
 * where the V group is 28 px wide inside the 40 px frame.
 */
export function VedaLogo({ size = 40, className, ...props }: VedaLogoProps) {
  return (
    <span
      aria-hidden="true"
      data-figma-node="2:10591"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[10px]",
        "shadow-[inset_0_-1px_2px_rgba(0,0,0,0.18),inset_0_1px_2px_rgba(255,255,255,0.25)]",
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      {/* Figma 2:10592 — background gradient (fallback) + grain photo overlay.
          The JPEG fully covers the gradient at runtime; gradient stays as a
          graceful fallback if the asset fails to load. */}
      <span
        aria-hidden="true"
        data-figma-node="2:10592"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[10px]"
      >
        <span className="absolute inset-0 bg-gradient-to-b from-[#e56820] to-[#d45e3e]" />
        <img
          alt=""
          aria-hidden="true"
          src="/brand/logo-grain.jpg"
          className="absolute left-[-21.2%] top-[-33.02%] h-[162.5%] w-[290.14%] max-w-none select-none object-cover"
          draggable={false}
        />
      </span>

      {/* Figma 2:10591 — the white "V" mark */}
      <svg
        viewBox="25.7143 12.8571 28.0 19.4218"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        style={{ width: "70%", height: "auto" }}
        className="relative"
      >
        <g>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M42.4413 30.2153C42.4413 30.2153 43.1688 32.1573 43.8355 32.2789H35.4112C33.7141 32.2789 32.1993 31.3079 31.714 29.487L26.805 14.9207C26.805 14.9207 26.381 13.1606 25.7143 12.8571H34.3204C36.0176 12.9179 37.1691 13.5247 37.8357 15.7706L42.4413 30.2153Z"
            fill="#ffffff"
          />
          <path
            opacity="0.18"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M42.4413 30.2153C42.4413 30.2153 43.1688 32.1573 43.8355 32.2789H35.4112C33.7141 32.2789 32.1993 31.3079 31.714 29.487L26.805 14.9207C26.805 14.9207 26.381 13.1606 25.7143 12.8571H34.3204C36.0176 12.9179 37.1691 13.5247 37.8357 15.7706L42.4413 30.2153Z"
            fill="url(#vedaLogoSheen)"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M37.0471 30.2149C37.0471 30.2149 36.3196 32.1569 35.6529 32.2784H44.0772C45.7743 32.2784 47.2891 31.3074 47.7744 29.4865L52.6231 14.9207C52.6231 14.9207 53.0471 13.1606 53.7138 12.8571H45.168C43.4709 12.8571 42.3801 13.464 41.7135 15.7098L37.0471 30.2149Z"
            fill="#ffffff"
          />
        </g>
        <defs>
          <linearGradient
            id="vedaLogoSheen"
            x1="34.7749"
            y1="11.2061"
            x2="34.7749"
            y2="33.9908"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.33" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.76" stopColor="#0E1513" />
            <stop offset="1" stopColor="#0E1513" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
