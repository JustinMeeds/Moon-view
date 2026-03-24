"use client";

import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Search } from "lucide-react";
import { FMZ_LIST, fmzFromCity } from "@/lib/fmz";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FMZMapPickerProps {
  open: boolean;
  currentFmz: number | null;
  onSelect: (fmzId: number) => void;
  onClose: () => void;
}

export function FMZMapPicker({ open, currentFmz, onSelect, onClose }: FMZMapPickerProps) {
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) { setQuery(""); setSearchResult(null); }
  }, [open]);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    const fmz = await fmzFromCity(query.trim());
    setSearchResult(fmz);
    setSearching(false);
    if (fmz !== null) onSelect(fmz);
  }

  function handleSelect(id: number) {
    onSelect(id);
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-w-lg mx-auto bg-[#0d1117] border border-white/10 rounded-t-2xl pb-safe max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
            <Dialog.Title className="text-base font-semibold text-white">Select Your FMZ</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Search */}
          <div className="px-5 pb-3 shrink-0">
            <div className="flex gap-2">
              <Input
                placeholder="City or lake name (e.g. Peterborough)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                className="flex-1"
              />
              <Button variant="secondary" size="icon" onClick={handleSearch} disabled={searching}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            {searchResult === null && query && !searching && (
              <p className="text-xs text-white/40 mt-1.5">No location match — select a zone below</p>
            )}
          </div>

          {/* Zone list */}
          <div className="overflow-y-auto flex-1 px-5 pb-5">
            <div className="space-y-1">
              {FMZ_LIST.map(({ id, name, label }) => {
                const active = id === currentFmz;
                return (
                  <button
                    key={id}
                    onClick={() => handleSelect(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      active
                        ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                        : "bg-white/5 border border-white/8 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-xs font-mono text-white/40 w-12 shrink-0">{name}</span>
                    <span className="text-sm font-medium flex-1">{label}</span>
                    {active && <span className="text-xs text-emerald-400 shrink-0">current</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
