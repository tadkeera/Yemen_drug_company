"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Drug {
  id: number;
  company_name: string;
  brand_name: string | null;
  trade_name: string | null;
  price: number;
  discount_percentage: string;
  public_price: number;
  agent_price: number;
  agent_price_before_discount: number;
  manufacturer: string | null;
  country_of_origin: string | null;
  [key: string]: any; // To allow dynamic custom columns
}

export default function AgentPage() {
  const params = useParams();
  const agentName = decodeURIComponent(params.name as string);

  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [dynamicColumns, setDynamicColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state (manufacturer dropdown)
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [uniqueManufacturers, setUniqueManufacturers] = useState<string[]>([]);

  // Edit state
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Drug>>({});
  const [saveLoading, setSaveLoading] = useState<number | null>(null);

  // Fetch data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 1. Fetch dynamic columns
        const colRes = await fetch("/api/search?type=columns");
        const cols = await colRes.json();
        if (cols.success) {
          // Columns exclude standard ones
          const exclude = [
            "brand_name", 
            "trade_name", 
            "discount_percentage", 
            "manufacturer", 
            "country_of_origin"
          ];
          const filtered = cols.data.filter((c: string) => !exclude.includes(c));
          setDynamicColumns(filtered);
        }

        // 2. Fetch drugs of this agent
        const res = await fetch(`/api/search?type=agent&query=${encodeURIComponent(agentName)}`);
        const drugsData = await res.json();
        if (drugsData.success) {
          const loadedDrugs: Drug[] = drugsData.data;
          setDrugs(loadedDrugs);

          // 3. Extract unique manufacturers dynamically
          const manufacturers = Array.from(
            new Set(
              loadedDrugs
                .map((d) => d.manufacturer?.trim())
                .filter(Boolean)
            )
          ) as string[];
          setUniqueManufacturers(manufacturers);
        } else {
          setError(drugsData.error || "فشلت عملية تحميل أصناف الوكيل.");
        }
      } catch (err) {
        setError("حدث خطأ أثناء تحميل البيانات من الخادم.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [agentName]);

  // Filter drugs by selected manufacturer
  const filteredDrugs = selectedManufacturer
    ? drugs.filter((d) => d.manufacturer === selectedManufacturer)
    : drugs;

  // Start editing a row
  const startEditing = (drug: Drug) => {
    setEditingRowId(drug.id);
    setEditData({ ...drug });
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingRowId(null);
    setEditData({});
  };

  // Handle edit input change
  const handleEditChange = (field: string, value: any) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Save changes to database
  const saveRow = async (id: number) => {
    setSaveLoading(id);
    try {
      let finalPrice = editData.public_price !== undefined ? parseFloat(editData.public_price as any) : undefined;
      
      const updates: any = {};
      if (editData.brand_name !== undefined) updates.brand_name = editData.brand_name;
      if (editData.trade_name !== undefined) updates.trade_name = editData.trade_name;
      if (finalPrice !== undefined) updates.price = finalPrice;
      if (editData.discount_percentage !== undefined) updates.discount_percentage = editData.discount_percentage;
      if (editData.manufacturer !== undefined) updates.manufacturer = editData.manufacturer;
      if (editData.country_of_origin !== undefined) updates.country_of_origin = editData.country_of_origin;
      
      // Add custom dynamic columns updates
      dynamicColumns.forEach((col) => {
        if (editData[col] !== undefined) {
          updates[col] = editData[col];
        }
      });

      const response = await fetch("/api/save?action=edit-drug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates })
      });
      const res = await response.json();

      if (res.success) {
        // Update local state dynamically
        setDrugs((prev) =>
          prev.map((d) => {
            if (d.id === id) {
              const updatedDrug = { ...d, ...editData } as Drug;
              const pPrice = finalPrice !== undefined ? finalPrice : d.price;
              const aPrice = pPrice / 1.15;
              
              let discountPct = 0;
              const discStr = editData.discount_percentage !== undefined ? editData.discount_percentage : d.discount_percentage;
              if (discStr) {
                const match = discStr.match(/(\d+(?:\.\d+)?)/);
                if (match) {
                  discountPct = parseFloat(match[1]);
                }
              }
              const aPriceBefore = discountPct > 0 ? aPrice / (1 - discountPct / 100) : aPrice;

              return {
                ...updatedDrug,
                price: pPrice,
                public_price: pPrice,
                agent_price: aPrice,
                agent_price_before_discount: aPriceBefore
              };
            }
            return d;
          })
        );

        // Recalculate unique manufacturers list in case one changed
        setTimeout(() => {
          setUniqueManufacturers(
            Array.from(
              new Set(
                drugs
                  .map((d) => (d.id === id ? editData.manufacturer : d.manufacturer)?.trim())
                  .filter(Boolean)
              )
            ) as string[]
          );
        }, 100);

        setEditingRowId(null);
        setEditData({});
        alert("تم حفظ التعديلات ومزامنتها بنجاح مع قاعدة البيانات!");
      } else {
        alert("خطأ: " + res.error);
      }
    } catch (err) {
      alert("فشل الاتصال بالخادم لحفظ التعديلات.");
    } finally {
      setSaveLoading(null);
    }
  };

  // EXPORT 1: CSV Export
  const exportToCSV = () => {
    const headers = [
      "الاسم التجاري (عربي)", 
      "trade name (إنجليزي)", 
      "الشركة المصنعة", 
      "بلد المنشأ", 
      "السعر للجمهور (YER)", 
      "سعر الوكيل (YER)", 
      "السعر قبل التخفيض (YER)", 
      "نسبة التخفيض"
    ];
    dynamicColumns.forEach((col) => headers.push(col));

    const csvRows = [headers.join(",")];

    filteredDrugs.forEach((drug) => {
      const row = [
        `"${(drug.brand_name || "").replace(/"/g, '""')}"`,
        `"${(drug.trade_name || "").replace(/"/g, '""')}"`,
        `"${(drug.manufacturer || "").replace(/"/g, '""')}"`,
        `"${(drug.country_of_origin || "").replace(/"/g, '""')}"`,
        drug.public_price.toFixed(1),
        drug.agent_price.toFixed(1),
        drug.agent_price_before_discount.toFixed(1),
        `"${drug.discount_percentage}"`
      ];
      dynamicColumns.forEach((col) => {
        row.push(`"${(drug[col] || "").toString().replace(/"/g, '""')}"`);
      });
      csvRows.push(row.join(","));
    });

    const csvContent = "\ufeff" + csvRows.join("\n"); // Include UTF-8 BOM for Arabic support
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تسعيرة_أدوية_${agentName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXPORT 2: HTML Export
  const exportToHTML = () => {
    const tableHeaders = [
      "الاسم التجاري (عربي)", 
      "trade name (إنجليزي)", 
      "الشركة المصنعة", 
      "بلد المنشأ", 
      "السعر للجمهور (YER)", 
      "سعر الوكيل (YER)", 
      "السعر قبل التخفيض (YER)", 
      "نسبة التخفيض", 
      ...dynamicColumns
    ]
      .map((h) => `<th style="padding:12px; border:1px solid #ddd; background:#1e293b; color:#fff; text-align:right;">${h}</th>`)
      .join("");

    const tableRows = filteredDrugs
      .map((drug) => {
        const standardCols = `
          <td style="padding:12px; border:1px solid #ddd; font-weight:bold;">${drug.brand_name || "-"}</td>
          <td style="padding:12px; border:1px solid #ddd; font-family:sans-serif;">${drug.trade_name || "-"}</td>
          <td style="padding:12px; border:1px solid #ddd;">${drug.manufacturer || "-"}</td>
          <td style="padding:12px; border:1px solid #ddd;">${drug.country_of_origin || "-"}</td>
          <td style="padding:12px; border:1px solid #ddd; color:#10b981; font-weight:bold;">${drug.public_price.toLocaleString()} YER</td>
          <td style="padding:12px; border:1px solid #ddd;">${drug.agent_price.toFixed(1)} YER</td>
          <td style="padding:12px; border:1px solid #ddd; text-decoration:line-through; color:#94a3b8;">${drug.agent_price_before_discount.toFixed(1)} YER</td>
          <td style="padding:12px; border:1px solid #ddd;"><span style="background:#fef3c7; color:#d97706; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:bold;">${drug.discount_percentage}</span></td>
        `;
        const customCols = dynamicColumns
          .map((col) => `<td style="padding:12px; border:1px solid #ddd;">${drug[col] || "-"}</td>`)
          .join("");

        return `<tr>${standardCols}${customCols}</tr>`;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تسعيرة أدوية - ${agentName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Cairo', sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; }
          h1 { color: #0f172a; text-align: center; margin-bottom: 5px; }
          p { text-align: center; color: #64748b; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; }
        </style>
      </head>
      <body>
        <h1>${agentName}</h1>
        <p>قائمة أسعار الأدوية المعتمدة - إجمالي الأصناف: ${filteredDrugs.length}</p>
        <table>
          <thead><tr>${tableHeaders}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تسعيرة_أدوية_${agentName}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Upper Brand Bar */}
      <header className="bg-gradient-to-r from-sky-950 to-teal-900 text-white py-4 px-6 shadow-md print:hidden">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-white p-2 rounded-full shadow-md hover:scale-105 transition-transform">
              <span className="text-teal-800 font-extrabold text-lg tracking-tight">SBDMA</span>
            </Link>
            <div>
              <h1 className="text-base md:text-lg font-bold">الهيئة العليا للأدوية والمستلزمات الطبية</h1>
              <p className="text-[10px] text-teal-200">المنصة الإلكترونية الرسمية للتحقق من أسعار الأدوية</p>
            </div>
          </div>
          <Link
            href="/"
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full border border-white/20 text-xs font-bold transition-all"
          >
            ← عودة للرئيسية
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
        
        {/* Title & Stats Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-0 print:shadow-none">
          <div className="flex-1">
            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full inline-block mb-3 print:hidden">
              جدول تسعيرة أدوية المنشأة المعتمدة
            </span>
            <h2 className="text-xl md:text-3xl font-black text-sky-950 font-sans tracking-tight leading-normal mb-4 md:mb-0">
              {agentName}
            </h2>
          </div>
          
          {/* Filters & Actions Column */}
          <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
            
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center md:justify-end">
              {/* Manufacturer Filter Dropdown (Optional Feature) */}
              {uniqueManufacturers.length > 1 && (
                <div className="relative print:hidden min-w-[200px]">
                  <select
                    value={selectedManufacturer}
                    onChange={(e) => setSelectedManufacturer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-teal-500 text-sky-950"
                  >
                    <option value="">تصفية حسب الشركة المصنعة (الكل)</option>
                    {uniqueManufacturers.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="bg-slate-50 border border-slate-100 px-6 py-2 rounded-xl text-center min-w-[150px] flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 block">عدد الأصناف</span>
                <span className="text-base font-black text-teal-700">{filteredDrugs.length} دواء مصفى</span>
              </div>
            </div>
            
            {/* Export buttons */}
            {!loading && drugs.length > 0 && (
              <div className="flex gap-2 w-full justify-center md:justify-end print:hidden">
                <button
                  onClick={() => window.print()}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                >
                  📄 تصدير PDF
                </button>
                <button
                  onClick={exportToCSV}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                >
                  📊 تصدير CSV
                </button>
                <button
                  onClick={exportToHTML}
                  className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                >
                  🌐 تصدير HTML
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-semibold text-sm">جاري جلب قائمة الأدوية...</p>
          </div>
        )}

        {/* Error message */}
        {error && !loading && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-6 py-4 rounded-xl text-center shadow-sm">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Drug Data Table Card */}
        {!loading && drugs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden print:border-0 print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-sky-950 to-teal-900 text-white text-xs md:text-sm font-bold uppercase tracking-wider">
                    <th className="py-4 px-6 text-center border-l border-white/10 print:hidden">#</th>
                    <th className="py-4 px-6 border-l border-white/10">الاسم التجاري والعبوة</th>
                    <th className="py-4 px-6 text-center border-l border-white/10">الشركة المصنعة</th>
                    <th className="py-4 px-6 text-center border-l border-white/10">بلد المنشأ</th>
                    <th className="py-4 px-6 text-center border-l border-white/10">السعر للجمهور</th>
                    <th className="py-4 px-6 text-center border-l border-white/10">سعر الوكيل</th>
                    <th className="py-4 px-6 text-center border-l border-white/10">سعر الوكيل قبل التخفيض</th>
                    <th className="py-4 px-6 text-center border-l border-white/10">نسبة التخفيض</th>
                    
                    {/* Dynamic custom columns */}
                    {dynamicColumns.map((col) => (
                      <th key={col} className="py-4 px-6 text-center border-l border-white/10">
                        {col}
                      </th>
                    ))}
                    <th className="py-4 px-6 text-center print:hidden">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs md:text-sm font-semibold">
                  {filteredDrugs.map((drug, index) => {
                    const isEditing = editingRowId === drug.id;
                    return (
                      <tr 
                        key={drug.id} 
                        className="hover:bg-teal-50/20 transition-colors duration-200 odd:bg-white even:bg-slate-50/30 text-slate-700"
                      >
                        <td className="py-4 px-6 text-center font-bold text-slate-400 border-l border-slate-100 print:hidden">
                          {index + 1}
                        </td>
                        
                        {/* 1. Brand & Trade Names */}
                        <td className="py-4 px-6 font-bold text-sky-950 border-l border-slate-100 max-w-xs md:max-w-md">
                          {isEditing ? (
                            <div className="flex flex-col gap-2 min-w-[200px]">
                              <input
                                type="text"
                                value={editData.brand_name || ""}
                                onChange={(e) => handleEditChange("brand_name", e.target.value)}
                                placeholder="الاسم بالعربي..."
                                className="w-full px-3 py-1.5 border border-teal-300 rounded-lg text-xs"
                              />
                              <input
                                type="text"
                                value={editData.trade_name || ""}
                                onChange={(e) => handleEditChange("trade_name", e.target.value)}
                                placeholder="Trade Name (EN)..."
                                className="w-full px-3 py-1.5 border border-teal-300 rounded-lg text-xs"
                              />
                            </div>
                          ) : (
                            <div>
                              <span className="block font-bold text-sky-950 leading-normal">
                                {drug.brand_name || drug.trade_name || "صنف غير معروف"}
                              </span>
                              {drug.brand_name && drug.trade_name && (
                                <span className="block text-[11px] text-slate-400 font-normal mt-0.5 font-sans">
                                  {drug.trade_name}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 2. Manufacturer */}
                        <td className="py-4 px-6 text-center border-l border-slate-100 text-slate-600">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.manufacturer || ""}
                              onChange={(e) => handleEditChange("manufacturer", e.target.value)}
                              className="w-28 px-3 py-1.5 border border-teal-300 rounded-lg text-xs"
                            />
                          ) : (
                            drug.manufacturer || "-"
                          )}
                        </td>

                        {/* 3. Country of Origin */}
                        <td className="py-4 px-6 text-center border-l border-slate-100 text-slate-500">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.country_of_origin || ""}
                              onChange={(e) => handleEditChange("country_of_origin", e.target.value)}
                              className="w-24 px-3 py-1.5 border border-teal-300 rounded-lg text-xs text-center"
                            />
                          ) : (
                            drug.country_of_origin ? `🌍 ${drug.country_of_origin}` : "-"
                          )}
                        </td>

                        {/* 4. Public Price */}
                        <td className="py-4 px-6 text-center font-extrabold text-emerald-700 border-l border-slate-100 bg-emerald-50/10">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editData.public_price || ""}
                              onChange={(e) => handleEditChange("public_price", parseFloat(e.target.value))}
                              className="w-24 px-3 py-1.5 border border-teal-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white text-center font-extrabold text-emerald-700"
                            />
                          ) : (
                            `${drug.public_price.toLocaleString()} YER`
                          )}
                        </td>

                        {/* 5. Agent Price */}
                        <td className="py-4 px-6 text-center font-bold text-sky-900 border-l border-slate-100">
                          {drug.agent_price.toLocaleString(undefined, { maximumFractionDigits: 1 })} YER
                        </td>

                        {/* 6. Agent Price Before Discount */}
                        <td className="py-4 px-6 text-center font-semibold text-slate-400 line-through border-l border-slate-100">
                          {drug.agent_price_before_discount.toLocaleString(undefined, { maximumFractionDigits: 1 })} YER
                        </td>

                        {/* 7. Discount Percentage */}
                        <td className="py-4 px-6 text-center border-l border-slate-100">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.discount_percentage || ""}
                              onChange={(e) => handleEditChange("discount_percentage", e.target.value)}
                              className="w-20 px-3 py-1.5 border border-teal-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white text-center"
                            />
                          ) : (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              drug.discount_percentage !== "لا يوجد" 
                                ? "bg-amber-100 text-amber-800" 
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {drug.discount_percentage}
                            </span>
                          )}
                        </td>

                        {/* 8. Dynamic custom columns */}
                        {dynamicColumns.map((col) => (
                          <td key={col} className="py-4 px-6 text-center border-l border-slate-100 text-slate-600">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData[col] || ""}
                                onChange={(e) => handleEditChange(col, e.target.value)}
                                className="w-28 px-3 py-1.5 border border-teal-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white text-center text-xs"
                              />
                            ) : (
                              drug[col] || "-"
                            )}
                          </td>
                        ))}

                        {/* 9. Actions */}
                        <td className="py-4 px-6 text-center print:hidden">
                          {isEditing ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => saveRow(drug.id)}
                                disabled={saveLoading === drug.id}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 disabled:opacity-50"
                              >
                                {saveLoading === drug.id ? "جاري..." : "💾 حفظ"}
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-slate-200"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(drug)}
                              className="text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-100 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                            >
                              ✏️ تعديل
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6 mt-12 border-t border-slate-800 print:hidden">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-right">
          <div>
            <h5 className="font-bold text-white text-lg mb-2">تسعيرة الأدوية في الجمهورية اليمنية</h5>
            <p className="text-xs max-w-md leading-relaxed text-slate-500">
              هذه المنصة مبنية ومحدثة استناداً إلى البيانات والتعاميم الرسمية الصادرة عن الهيئة العليا للأدوية والمستلزمات الطبية - المركز الرئيسي عدن.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2 text-xs text-slate-500">
            <span>جميع الحقوق محفوظة © {new Date().getFullYear()}</span>
            <span>بناء وتصميم ذكي بالكامل لمساعدة الصيادلة والمواطنين</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
