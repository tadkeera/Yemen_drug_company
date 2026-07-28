import { NextResponse } from 'next/server';
import { getDbConnection } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const query = searchParams.get('query');

    const db = await getDbConnection();

    // 1. Get List of all unique agents
    if (type === 'agent-list') {
      const rows = await db.all(
        `SELECT DISTINCT company_name FROM drugs 
         WHERE company_name IS NOT NULL AND company_name != '' 
         ORDER BY company_name`
      );
      const agents = rows.map((r: any) => r.company_name);
      return NextResponse.json({ success: true, data: agents });
    }

    // Check query param
    if (!query) {
      return NextResponse.json({ success: false, error: 'Query parameter is required' }, { status: 400 });
    }

    // 2. Search by Drug Name
    if (type === 'drug') {
      const rows = await db.all(
        `SELECT id, company_name, brand_name, price, discount_percentage 
         FROM drugs 
         WHERE brand_name LIKE ? 
         LIMIT 50`,
        [`%${query}%`]
      );

      const data = rows.map((r: any) => {
        const publicPrice = r.price; // The database price is the approved public price
        const agentPrice = publicPrice / 1.15; // Calculated agent price with 15% pharmacy markup
        
        // Parse discount percentage (e.g., "43%" or "43.00%")
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
          discount_percentage: r.discount_percentage || 'لا يوجد'
        };
      });

      return NextResponse.json({ success: true, data });
    }

    // 3. Search by Agent Name
    if (type === 'agent') {
      const rows = await db.all(
        `SELECT id, company_name, brand_name, price, discount_percentage 
         FROM drugs 
         WHERE company_name LIKE ? 
         ORDER BY brand_name 
         LIMIT 100`,
        [`%${query}%`]
      );

      const data = rows.map((r: any) => {
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
          discount_percentage: r.discount_percentage || 'لا يوجد'
        };
      });

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: 'Invalid search type' }, { status: 400 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
