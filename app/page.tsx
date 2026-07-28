"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Drug {
  id: number;
  brand_name: string;
  company_name: string;
  public_price: number;
  agent_price: number;
  agent_price_before_discount: number;
  discount_percentage: string;
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"drug" | "agent">("drug");
  
  // Search states
  const [drugQuery, setDrugQuery] = useState("");
  const [agentQuery, setAgentQuery] = useState("");
  const [drugResults, setDrugResults] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Agent list for dropdown/autocomplete
  const [allAgents, setAllAgents] = useState<string[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<string[]>([]);
  const [showAgentSuggestions, setShowAgentSuggestions] = useState(false);

  // Fetch unique agents on mount
  useEffect(() => {
    async function fetchAgents() {
      try {
        const r = await fetch("/api/search?type=agent-list");
        const res = await r.json();
        if (res.success) {
          setAllAgents(res.data);
          setFilteredAgents(res.data);
        }
      } catch (err) {
        console.error("Failed to load agents list:", err);
      }
    }
    fetchAgents();
  }, []);

  // Filter agents autocomplete
  useEffect(() => {
    if (!agentQuery.trim()) {
      setFilteredAgents(allAgents);
    } else {
      setFilteredAgents(
        allAgents.filter((agent) =>
          agent.toLowerCase().includes(agentQuery.toLowerCase())
        )
      );
    }
  }, [agentQuery, allAgents]);

  // Handle drug search
  const handleDrugSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!drugQuery.trim()) return;

    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/search?type=drug&query=${encodeURIComponent(drugQuery)}`);
      const res = await r.json();
      if (res.success) {
        setDrugResults(res.data);
        if (res.data.length === 0) {
          setError("لم يتم العثور على أي نتائج تطابق هذا الاسم.");
        }
      } else {
        setError(res.error || "حدث خطأ أثناء البحث.");
      }
    } catch (err) {
      setError("فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  // Live search as user types for drug name (debounce or direct)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (drugQuery.trim().length >= 2) {
        handleDrugSearch();
      } else if (drugQuery.trim().length === 0) {
        setDrugResults([]);
        setError("");
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [drugQuery]);

  // Handle agent search navigate
  const handleAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentQuery.trim()) return;
    router.push(`/agent/${encodeURIComponent(agentQuery.trim())}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Upper Brand Bar */}
      <header className="bg-gradient-to-r from-sky-950 to-teal-900 text-white py-4 px-6 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-full shadow-md">
              <span className="text-teal-800 font-extrabold text-xl tracking-tight">SBDMA</span>
            </div>
            <div className="text-center md:text-right">
              <h1 className="text-lg md:text-xl font-bold">الهيئة العليا للأدوية والمستلزمات الطبية</h1>
              <p className="text-xs text-teal-200">المنصة الإلكترونية الرسمية للتحقق من أسعار الأدوية</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/20">
            <span className="inline-block w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-xs font-semibold text-emerald-100">قاعدة بيانات معتمدة ونشطة</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col gap-8">
        
        {/* Hero Section */}
        <section className="text-center py-6 md:py-10 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl"></div>
          
          <h2 className="text-2xl md:text-4xl font-extrabold text-sky-950 mb-4 leading-normal">
            تحقق من أسعار الأدوية الرسمية المعتمدة في اليمن
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm md:text-base leading-relaxed mb-8">
            بوابة تفاعلية ذكية تتيح للمواطنين، الصيادلة، والأطباء البحث الفوري والمقارنة بين أسعار الأدوية والبدائل المتاحة لجميع الشركات والوكلاء المسجلين رسمياً.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-10">
            <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100">
              <span className="block text-2xl md:text-3xl font-black text-sky-900">7,400+</span>
              <span className="text-xs text-slate-500">صنف دواء معتمد</span>
            </div>
            <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100">
              <span className="block text-2xl md:text-3xl font-black text-teal-900">197</span>
              <span className="text-xs text-slate-500">وكيل ومنشأة مرخصة</span>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <span className="block text-2xl md:text-3xl font-black text-emerald-900">100%</span>
              <span className="text-xs text-slate-500">مطابق لتسعيرة الهيئة</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="block text-2xl md:text-3xl font-black text-slate-800">تحديث</span>
              <span className="text-xs text-slate-500">فوري ومستمر</span>
            </div>
          </div>

          {/* Search Tabs */}
          <div className="max-w-xl mx-auto">
            {/* Tab Headers */}
            <div className="flex bg-slate-100 p-1.5 rounded-full mb-6">
              <button
                onClick={() => setActiveTab("drug")}
                className={`flex-1 py-3 text-sm font-bold rounded-full transition-all duration-300 ${
                  activeTab === "drug"
                    ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md"
                    : "text-slate-600 hover:text-sky-950"
                }`}
              >
                🔍 بحث باسم الدواء
              </button>
              <button
                onClick={() => setActiveTab("agent")}
                className={`flex-1 py-3 text-sm font-bold rounded-full transition-all duration-300 ${
                  activeTab === "agent"
                    ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md"
                    : "text-slate-600 hover:text-sky-950"
                }`}
              >
                🏢 بحث باسم الوكيل
              </button>
            </div>

            {/* Option A: Search by Drug Name */}
            {activeTab === "drug" && (
              <form onSubmit={handleDrugSearch} className="relative">
                <div className="flex shadow-md rounded-2xl overflow-hidden border border-slate-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 bg-white">
                  <input
                    type="text"
                    value={drugQuery}
                    onChange={(e) => setDrugQuery(e.target.value)}
                    placeholder="اكتب اسم الدواء بالإنجليزية أو العربية (مثال: Naze)..."
                    className="flex-1 px-5 py-4 text-base focus:outline-none bg-transparent"
                  />
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-8 font-bold transition-all text-sm md:text-base flex items-center justify-center gap-2"
                  >
                    <span>بحث</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 text-right mt-2 pr-2">
                  * يبدأ البحث تلقائياً بمجرد كتابة حرفين أو أكثر
                </p>
              </form>
            )}

            {/* Option B: Search by Agent Name */}
            {activeTab === "agent" && (
              <form onSubmit={handleAgentSubmit} className="relative">
                <div className="flex shadow-md rounded-2xl overflow-hidden border border-slate-200 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 bg-white">
                  <input
                    type="text"
                    value={agentQuery}
                    onChange={(e) => {
                      setAgentQuery(e.target.value);
                      setShowAgentSuggestions(true);
                    }}
                    onFocus={() => setShowAgentSuggestions(true)}
                    placeholder="اكتب اسم الوكيل أو المنشأة الصيدلانية..."
                    className="flex-1 px-5 py-4 text-base focus:outline-none bg-transparent"
                  />
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-8 font-bold transition-all text-sm md:text-base flex items-center justify-center gap-2"
                  >
                    <span>عرض الأدوية</span>
                  </button>
                </div>

                {/* Autocomplete Dropdown */}
                {showAgentSuggestions && agentQuery.trim().length > 0 && filteredAgents.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl text-right">
                    {filteredAgents.slice(0, 15).map((agent, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setAgentQuery(agent);
                          setShowAgentSuggestions(false);
                          router.push(`/agent/${encodeURIComponent(agent)}`);
                        }}
                        className="w-full text-right px-5 py-3 hover:bg-teal-50 transition-colors border-b border-slate-50 last:border-0 text-sm font-semibold text-slate-700 flex justify-between items-center"
                      >
                        <span className="text-teal-600 text-xs">عرض المنتجات ↚</span>
                        <span>{agent}</span>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            )}
          </div>
        </section>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-semibold">جاري البحث عن الأصناف الدوائية...</p>
          </div>
        )}

        {/* Error message */}
        {error && !loading && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-6 py-4 rounded-xl text-center shadow-sm">
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Search Results (Option A Cards) */}
        {!loading && drugResults.length > 0 && (
          <section className="flex flex-col gap-6">
            <h3 className="text-xl font-extrabold text-sky-950 flex justify-between items-center border-r-4 border-teal-600 pr-3">
              <span>نتائج البحث ({drugResults.length} صنف)</span>
              <button 
                onClick={() => { setDrugResults([]); setDrugQuery(""); }}
                className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-1.5 rounded-full transition-colors"
              >
                مسح النتائج
              </button>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {drugResults.map((drug) => (
                <div
                  key={drug.id}
                  className="bg-white rounded-2xl shadow-md hover:shadow-xl border border-slate-100 p-6 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="inline-block bg-teal-50 text-teal-800 text-xs font-bold px-2.5 py-1 rounded-full mb-2">
                        {drug.company_name}
                      </span>
                      <h4 className="text-lg font-bold text-sky-950 font-sans tracking-tight">
                        {drug.brand_name}
                      </h4>
                    </div>
                    <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-xl border border-emerald-100 text-center min-w-[110px]">
                      <span className="block text-xs font-semibold text-slate-500 mb-1">السعر للجمهور</span>
                      <span className="block text-lg font-black text-emerald-700">
                        {drug.public_price.toLocaleString()} YER
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <hr className="border-slate-100" />

                  {/* Card Details (Agent Pricing) */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">نسبة التخفيض</span>
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                        {drug.discount_percentage}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">سعر الوكيل</span>
                      <span className="block text-xs font-bold text-sky-900">
                        {drug.agent_price.toLocaleString(undefined, { maximumFractionDigits: 1 })} YER
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">السعر قبل التخفيض</span>
                      <span className="block text-xs font-bold text-slate-500 line-through">
                        {drug.agent_price_before_discount.toLocaleString(undefined, { maximumFractionDigits: 1 })} YER
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6 mt-12 border-t border-slate-800">
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
