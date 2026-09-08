"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, FolderCheck } from "lucide-react";

interface CollapsibleCategoryProps {
  kategori: string;
  isComplete: boolean;
  collected: number;
  total: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleCategory({
  kategori,
  isComplete,
  collected,
  total,
  children,
  defaultOpen = false,
}: CollapsibleCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border border-primary-light/20 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-5 flex items-center justify-between border-b transition-colors cursor-pointer ${
          isComplete
            ? "bg-success/5 border-success/20"
            : "bg-bg-cream border-primary-light/20"
        } hover:bg-primary/5`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isComplete
                ? "bg-success text-white"
                : "bg-white text-primary border border-primary/20 shadow-sm"
            }`}
          >
            {isComplete ? (
              <CheckCircle2 size={20} />
            ) : (
              <FolderCheck size={20} />
            )}
          </div>
          <div className="text-left">
            <h3 className="font-heading font-bold text-text-primary">
              Berkas {kategori}
            </h3>
            <p className="text-xs text-text-secondary">
              {isComplete
                ? "Semua berkas terkumpul"
                : `${collected} dari ${total} dikumpulkan`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge counter */}
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isComplete
                ? "bg-success/10 text-success"
                : "bg-primary/10 text-primary"
            }`}
          >
            {collected}/{total}
          </span>
          <ChevronDown
            size={20}
            className={`text-text-secondary transition-transform duration-300 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Collapsible content with animation */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="divide-y divide-primary-light/10">{children}</div>
        </div>
      </div>
    </div>
  );
}
