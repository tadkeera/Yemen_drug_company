import Link from "next/link";
import { getDbConnection } from "../../../lib/db";

interface Drug {
  id: number;
  company_name: string;
  brand_name: string;
  price: number;
  discount_percentage: string | null;
}

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function AgentPage({ params }: PageProps) {
  // Await params for Next.js App Router async params
  const { name: encodedName } = await params;
  const agentName = decodeURIComponent(encodedName);

  const db = await getDbConnection();

  // Query all drugs for this agent
  const rows: Drug[] = await db.all(
    `SELECT id, company_name, brand_name, price, discount_percentage 
     FROM drugs 
     WHERE company_name = ? 
     ORDER BY brand_name`,
    [agentName]
  );

  // Process rows with calculations
  const drugs = rows.map((r) => {
    const publicPrice = r.price;
    const agentPrice = publicPrice / 1.15;

    let discountPct = 0;
    if (r.discount_percentage) {
      const match = r.discount_percentage.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        discountPct = parseFloat(match[1]);
      }
    }

    const agentPriceBefore = discountPct > 0 
      ? agentPrice / (1 - discountPct / 100)
      : agentPrice;

    return {
      id: r.id,
      brand_name: r.brand_name,
      company_name: r.company_name,
      public_price: publicPrice,
      agent_price: agentPrice,
      agent_price_before_discount: agentPriceBefore,
      discount_percentage: r.discount_percentage || "لا يوجد"
    };
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Upper Brand Bar */}
      <header className="bg-gradient-to-r from-sky-950 to-teal-900 text-white py-4 px-6 shadow-md">
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
        <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full inline-block mb-3">
              جدول تسعيرة أدوية المنشأة المعتمدة
            </span>
            <h2 className="text-xl md:text-3xl font-black text-sky-950 font-sans tracking-tight leading-normal">
              {agentName}
            </h2>
          </div>
          <div className="bg-slate-50 border border-slate-100 px-6 py-4 rounded-xl text-center md:text-left">
            <span className="text-xs text-slate-500 block mb-1">إجمالي الأصناف المعتمدة</span>
            <span className="text-xl md:text-2xl font-black text-teal-700">{drugs.length} دواء مسجل</span>
          </div>
        </div>

        {/* Drug Data Table Card */}
        {drugs.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-sky-950 to-teal-900 text-white text-xs md:text-sm font-bold uppercase tracking-wider">
                    <th className="py-4 px-6 text-center border-l border-white/10">#</th>
                    <th className="py-4 px-6 border-l border-white/10">الاسم التجاري والعبوة</th>
                    <th className="py-4 px-6 text-center border-l border-white/10">السعر للجمهور</th>
                    <th className="py-4 px-6 text-center border-l border-white/10">سعر الوكيل</th>
                    <th className="py-4 px-6 text-center border-l border-white/10">سعر الوكيل قبل التخفيض</th>
                    <th className="py-4 px-6 text-center">نسبة التخفيض</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {drugs.map((drug, index) => (
                    <tr 
                      key={drug.id} 
                      className="hover:bg-teal-50/40 transition-colors duration-200 odd:bg-white even:bg-slate-50/30 text-slate-700"
                    >
                      <td className="py-4 px-6 text-center font-bold text-slate-400 border-l border-slate-100">
                        {index + 1}
                      </td>
                      <td className="py-4 px-6 font-bold text-sky-950 border-l border-slate-100 max-w-xs md:max-w-md">
                        {drug.brand_name}
                      </td>
                      <td className="py-4 px-6 text-center font-extrabold text-emerald-700 border-l border-slate-100 bg-emerald-50/20">
                        {drug.public_price.toLocaleString()} YER
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-sky-900 border-l border-slate-100">
                        {drug.agent_price.toLocaleString(undefined, { maximumFractionDigits: 1 })} YER
                      </td>
                      <td className="py-4 px-6 text-center font-semibold text-slate-400 line-through border-l border-slate-100">
                        {drug.agent_price_before_discount.toLocaleString(undefined, { maximumFractionDigits: 1 })} YER
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                          drug.discount_percentage !== "لا يوجد" 
                            ? "bg-amber-100 text-amber-800" 
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {drug.discount_percentage}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm">
            <span className="text-4xl">⚠️</span>
            <h3 className="text-lg font-bold text-slate-800 mt-4">عفواً، لا توجد أي أدوية مسجلة لهذه المنشأة حالياً</h3>
            <p className="text-slate-400 text-sm mt-2">يرجى مراجعة الاسم أو العودة للصفحة الرئيسية للبحث.</p>
            <Link
              href="/"
              className="mt-6 inline-block bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2 rounded-full text-sm transition-all"
            >
              العودة للرئيسية
            </Link>
          </div>
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
