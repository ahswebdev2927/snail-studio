"use client";
import React, { useState, useEffect } from "react";
import { customConfirm } from "@/components/ui/alert-dialog-provider";
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Ruler,
  Save,
  X
} from "lucide-react";

interface ShapeLengthRow {
  id: string;
  shape: string;
  xs: string;
  s: string;
  m: string;
  l: string;
}

const DEFAULT_ROWS: ShapeLengthRow[] = [
  { id: "1", shape: "Stiletto", xs: "14mm - 19mm", s: "15mm - 23mm", m: "18mm - 24mm", l: "18mm - 25mm" },
  { id: "2", shape: "Square", xs: "12mm - 17mm", s: "13mm - 20mm", m: "14mm - 23mm", l: "19mm - 25mm" },
  { id: "3", shape: "Square Oval", xs: "12mm - 17mm", s: "13mm - 20mm", m: "14mm - 23mm", l: "19mm - 25mm" },
  { id: "4", shape: "Round", xs: "12mm - 17mm", s: "12mm - 21mm", m: "15mm - 24mm", l: "18mm - 27mm" },
  { id: "5", shape: "Oval", xs: "10mm - 20mm", s: "13mm - 23mm", m: "15mm - 24mm", l: "18mm - 27mm" },
  { id: "6", shape: "Coffin", xs: "12mm - 17mm", s: "14mm - 19mm", m: "16mm - 22mm", l: "20mm - 26mm" },
  { id: "7", shape: "Almond", xs: "14mm - 19mm", s: "15mm - 23mm", m: "18mm - 24mm", l: "18mm - 25mm" }
];

export default function LengthChartTab() {
  const [rows, setRows] = useState<ShapeLengthRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<Partial<ShapeLengthRow> | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.length_chart_settings) {
          try {
            const parsed = JSON.parse(data.length_chart_settings);
            setRows(parsed);
          } catch (e) {
            console.error("Failed to parse length chart settings JSON, falling back to default:", e);
            setRows(DEFAULT_ROWS);
          }
        } else {
          setRows(DEFAULT_ROWS);
        }
      } else {
        showStatus("error", "Failed to retrieve configuration settings.");
        setRows(DEFAULT_ROWS);
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while fetching configuration settings.");
      setRows(DEFAULT_ROWS);
    } finally {
      setIsLoading(false);
    }
  };

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  const handleOpenAddModal = () => {
    setCurrentRow({
      shape: "",
      xs: "",
      s: "",
      m: "",
      l: ""
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (row: ShapeLengthRow) => {
    setCurrentRow(row);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteRow = async (id: string, shape: string) => {
    if (!await customConfirm("Delete Length Configuration", `Are you sure you want to delete the length configuration for shape "${shape}"?`)) return;
    
    const updatedRows = rows.filter((r) => r.id !== id);
    setRows(updatedRows);
    await saveSettings(updatedRows, `Length configuration for shape "${shape}" deleted.`);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!currentRow) return false;

    if (!currentRow.shape || currentRow.shape.trim() === "") {
      errors.shape = "Shape name is required.";
    }

    if (!currentRow.xs || currentRow.xs.trim() === "") {
      errors.xs = "XS length is required (e.g. 14mm - 19mm).";
    }

    if (!currentRow.s || currentRow.s.trim() === "") {
      errors.s = "S length is required.";
    }

    if (!currentRow.m || currentRow.m.trim() === "") {
      errors.m = "M length is required.";
    }

    if (!currentRow.l || currentRow.l.trim() === "") {
      errors.l = "L length is required.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveSettings = async (rowsData: ShapeLengthRow[], successMsg: string) => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          length_chart_settings: JSON.stringify(rowsData)
        })
      });

      if (res.ok) {
        showStatus("success", successMsg);
        return true;
      } else {
        const errData = await res.json();
        showStatus("error", errData.error || "Failed to save settings.");
        return false;
      }
    } catch (err) {
      console.error(err);
      showStatus("error", "An error occurred while saving settings.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !currentRow) return;

    let updatedRows = [...rows];
    
    if (currentRow.id) {
      // Edit
      updatedRows = updatedRows.map((r) => r.id === currentRow.id ? (currentRow as ShapeLengthRow) : r);
    } else {
      // Add new
      const newRow: ShapeLengthRow = {
        ...(currentRow as Omit<ShapeLengthRow, "id">),
        id: String(Date.now())
      };
      updatedRows.push(newRow);
    }

    const success = await saveSettings(updatedRows, `Shape "${currentRow.shape}" length ranges saved successfully.`);
    if (success) {
      setRows(updatedRows);
      setIsModalOpen(false);
      setCurrentRow(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-light">Loading length chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-lg font-normal text-foreground">Length Chart Management</h2>
          <p className="text-[11px] text-muted-foreground font-light">
            Manage nail shape length guides (XS, S, M, L). These values determine the shape lengths displayed in the table on the storefront sizing page.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 hover:scale-[1.01] active:scale-[0.99] rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            Add Shape Length
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 border text-xs leading-relaxed animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Length Rows Table */}
      {rows.length === 0 ? (
        <div className="bg-card border border-border/40 rounded-3xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto text-muted-foreground">
            <Ruler className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium">No Length Configurations Configured</h3>
            <p className="text-xs text-muted-foreground font-light max-w-xs mx-auto">
              Create nail shapes and set their length ranges to display them on the storefront.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border hover:bg-secondary/40 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create First Shape Length
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border/40 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-light">
              <thead>
                <tr className="border-b border-border/40 text-foreground font-semibold bg-secondary/15">
                  <th className="py-4 px-6">Shape Name</th>
                  <th className="py-4 px-6 text-center">XS Length</th>
                  <th className="py-4 px-6 text-center">S Length</th>
                  <th className="py-4 px-6 text-center">M Length</th>
                  <th className="py-4 px-6 text-center">L Length</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/25">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="py-4 px-6 font-semibold text-primary">{row.shape}</td>
                    <td className="py-4 px-6 text-center font-mono">{row.xs}</td>
                    <td className="py-4 px-6 text-center font-mono">{row.s}</td>
                    <td className="py-4 px-6 text-center font-mono">{row.m}</td>
                    <td className="py-4 px-6 text-center font-mono">{row.l}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(row)}
                          className="p-2 text-muted-foreground hover:text-primary transition-all rounded-lg hover:bg-secondary/40 cursor-pointer"
                          aria-label="Edit shape length"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id, row.shape)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-all rounded-lg hover:bg-destructive/10 cursor-pointer"
                          aria-label="Delete shape length"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && currentRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-card border border-border/40 rounded-3xl shadow-2xl overflow-hidden my-auto animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h2 className="font-serif text-lg text-foreground font-semibold">
                {currentRow.id ? "Edit Shape Length" : "Add Shape Length"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveRow} className="p-6 space-y-6">
              <div className="space-y-4">
                {/* Shape Name */}
                <div className="space-y-1.5">
                  <label htmlFor="shape" className="text-xs font-semibold text-foreground">Shape Name</label>
                  <input
                    id="shape"
                    type="text"
                    placeholder="e.g. Coffin, Almond, Stiletto"
                    value={currentRow.shape || ""}
                    onChange={(e) => setCurrentRow({ ...currentRow, shape: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-border rounded-xl text-xs bg-background/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {formErrors.shape && (
                    <span className="text-[10px] text-destructive block font-medium">{formErrors.shape}</span>
                  )}
                </div>

                <hr className="border-border/30 my-2" />

                {/* Length ranges */}
                <div className="space-y-4">
                  <span className="text-xs font-bold text-foreground block">Length Ranges (e.g. 14mm - 19mm)</span>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* XS */}
                    <div className="space-y-1.5">
                      <label htmlFor="xs" className="text-[11px] font-semibold text-muted-foreground">XS Length</label>
                      <input
                        id="xs"
                        type="text"
                        placeholder="e.g. 14mm - 19mm"
                        value={currentRow.xs || ""}
                        onChange={(e) => setCurrentRow({ ...currentRow, xs: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                      {formErrors.xs && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.xs}</span>
                      )}
                    </div>

                    {/* S */}
                    <div className="space-y-1.5">
                      <label htmlFor="s" className="text-[11px] font-semibold text-muted-foreground">S Length</label>
                      <input
                        id="s"
                        type="text"
                        placeholder="e.g. 15mm - 23mm"
                        value={currentRow.s || ""}
                        onChange={(e) => setCurrentRow({ ...currentRow, s: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                      {formErrors.s && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.s}</span>
                      )}
                    </div>

                    {/* M */}
                    <div className="space-y-1.5">
                      <label htmlFor="m" className="text-[11px] font-semibold text-muted-foreground">M Length</label>
                      <input
                        id="m"
                        type="text"
                        placeholder="e.g. 18mm - 24mm"
                        value={currentRow.m || ""}
                        onChange={(e) => setCurrentRow({ ...currentRow, m: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                      {formErrors.m && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.m}</span>
                      )}
                    </div>

                    {/* L */}
                    <div className="space-y-1.5">
                      <label htmlFor="l" className="text-[11px] font-semibold text-muted-foreground">L Length</label>
                      <input
                        id="l"
                        type="text"
                        placeholder="e.g. 18mm - 25mm"
                        value={currentRow.l || ""}
                        onChange={(e) => setCurrentRow({ ...currentRow, l: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                      {formErrors.l && (
                        <span className="text-[9px] text-destructive block font-medium">{formErrors.l}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4.5 py-2.5 rounded-xl border border-border hover:bg-secondary/40 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4 text-white" />
                  {isSaving ? "Saving..." : "Save Length"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
