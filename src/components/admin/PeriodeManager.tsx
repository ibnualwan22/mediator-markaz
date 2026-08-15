"use client";

import { useState } from "react";
import { createPeriode, setPeriodeActive, createGelombang, setGelombangActive } from "@/app/admin/(dashboard)/periode/actions";

export default function PeriodeManager({ periodes }: { periodes: any[] }) {
  const [newPeriode, setNewPeriode] = useState({ nama: "", tahunDibuka: new Date().getFullYear() });
  const [newGelombang, setNewGelombang] = useState({ nama: "", periodeId: "", start: "", end: "" });

  const handleCreatePeriode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriode.nama) return;
    await createPeriode(newPeriode);
    setNewPeriode({ nama: "", tahunDibuka: new Date().getFullYear() });
  };

  const handleCreateGelombang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGelombang.nama || !newGelombang.periodeId || !newGelombang.start || !newGelombang.end) return;
    await createGelombang(newGelombang);
    setNewGelombang({ nama: "", periodeId: "", start: "", end: "" });
  };

  return (
    <div className="space-y-8">
      {/* List Periode */}
      <div className="grid gap-6">
        {periodes.map(p => (
          <div key={p.id} className={`p-6 rounded-2xl border ${p.isActive ? 'border-primary ring-1 ring-primary shadow-sm bg-primary/5' : 'border-primary-light/20 bg-white'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-heading font-bold text-text-primary">{p.nama}</h3>
                <p className="text-sm text-text-secondary">Tahun Periode: {p.tahunDibuka}</p>
              </div>
              <button 
                onClick={() => setPeriodeActive(p.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${p.isActive ? 'bg-primary text-white' : 'bg-bg-cream text-text-secondary hover:bg-primary-light/20'}`}
              >
                {p.isActive ? "Aktif" : "Set Aktif"}
              </button>
            </div>

            <div className="mt-4 border-t border-primary-light/20 pt-4">
              <h4 className="font-bold text-sm mb-3">Gelombang</h4>
              {p.gelombang.length > 0 ? (
                <div className="space-y-2">
                  {p.gelombang.map((g: any) => (
                    <div key={g.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-primary-light/10 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{g.nama}</span>
                        <span className="text-xs text-text-secondary">
                          ({new Date(g.tanggalBuka).toLocaleDateString()} - {new Date(g.tanggalTutup).toLocaleDateString()})
                        </span>
                      </div>
                      <button 
                        onClick={() => p.isActive && setGelombangActive(g.id, p.id)}
                        disabled={!p.isActive}
                        className={`text-xs px-3 py-1 rounded-full font-medium ${!p.isActive ? 'opacity-50 cursor-not-allowed bg-gray-100' : g.isActive ? 'bg-success text-white' : 'bg-gray-100 hover:bg-success/20 text-text-secondary'}`}
                      >
                        {g.isActive ? "Buka (Pendaftaran Aktif)" : "Buka Gelombang"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary italic">Belum ada gelombang.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tambah Periode Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary-light/20">
          <h3 className="font-bold mb-4">Tambahkan Periode Baru</h3>
          <form onSubmit={handleCreatePeriode} className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary">Nama Periode</label>
              <input type="text" required value={newPeriode.nama} onChange={e => setNewPeriode({...newPeriode, nama: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1" placeholder="Tahun Ajaran 2026/2027" />
            </div>
            <div>
              <label className="text-sm text-text-secondary">Tahun Dibuka</label>
              <input type="number" required value={newPeriode.tahunDibuka} onChange={e => setNewPeriode({...newPeriode, tahunDibuka: parseInt(e.target.value)})} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1" />
            </div>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium w-full hover:bg-primary-light">Tambah Periode</button>
          </form>
        </div>

        {/* Tambah Gelombang Form */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary-light/20">
          <h3 className="font-bold mb-4">Tambahkan Gelombang</h3>
          <form onSubmit={handleCreateGelombang} className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary">Pilih Periode</label>
              <select required value={newGelombang.periodeId} onChange={e => setNewGelombang({...newGelombang, periodeId: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1">
                <option value="">Pilih...</option>
                {periodes.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary">Nama Gelombang</label>
              <input type="text" required value={newGelombang.nama} onChange={e => setNewGelombang({...newGelombang, nama: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none focus:border-primary mt-1" placeholder="Gelombang 1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm text-text-secondary">Tanggal Buka</label>
                <input type="date" required value={newGelombang.start} onChange={e => setNewGelombang({...newGelombang, start: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none mt-1" />
              </div>
              <div>
                <label className="text-sm text-text-secondary">Tanggal Tutup</label>
                <input type="date" required value={newGelombang.end} onChange={e => setNewGelombang({...newGelombang, end: e.target.value})} className="w-full px-3 py-2 rounded-lg border outline-none mt-1" />
              </div>
            </div>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium w-full hover:bg-primary-light">Tambah Gelombang</button>
          </form>
        </div>
      </div>
    </div>
  );
}
