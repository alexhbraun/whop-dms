import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const community_id = searchParams.get('community_id');

  if (!community_id) {
    return NextResponse.json({ success: false, error: 'Community ID is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('onboarding_questions') // Assuming a table named 'onboarding_questions'
      .select('*')
      .eq('community_id', community_id)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching questions:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Unexpected error in GET /api/questions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const community_id = searchParams.get('community_id');

  if (!community_id) {
    return NextResponse.json({ success: false, error: 'Community ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { label, key, type, is_required, options } = body;

    if (!label || !key || !type) {
      return NextResponse.json({ success: false, error: 'Label, key, and type are required' }, { status: 400 });
    }

    // Get the current highest order_index for this community
    const { data: maxOrderData, error: maxOrderError } = await supabaseAdmin
      .from('onboarding_questions')
      .select('order_index')
      .eq('community_id', community_id)
      .order('order_index', { ascending: false })
      .limit(1);

    if (maxOrderError) {
      console.error('Error fetching max order_index:', maxOrderError);
      return NextResponse.json({ success: false, error: maxOrderError.message }, { status: 500 });
    }

    const newOrderIndex = (maxOrderData && maxOrderData.length > 0) ? maxOrderData[0].order_index + 1 : 0;

    const { data, error } = await supabaseAdmin
      .from('onboarding_questions')
      .insert({
        community_id,
        label,
        key_slug: key, // Store as key_slug in DB
        type,
        is_required: is_required || false,
        options: options || [],
        order_index: newOrderIndex,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating question:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Unexpected error in POST /api/questions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const community_id = searchParams.get('community_id');
  const id = searchParams.get('id');

  if (!community_id || !id) {
    return NextResponse.json({ success: false, error: 'Community ID and Question ID are required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { label, key, type, is_required, options, order_index, updates } = body;

    if (updates && Array.isArray(updates)) { // Handle reorder request
      const batchUpdatePromises = updates.map((update: { id: string; order_index: number }) =>
        supabaseAdmin
          .from('onboarding_questions')
          .update({ order_index: update.order_index })
          .eq('id', update.id)
          .eq('community_id', community_id) // Ensure security and scope
      );
      const results = await Promise.all(batchUpdatePromises);
      if (results.some(r => r.error)) {
        console.error('Error reordering questions:', results.map(r => r.error).filter(Boolean));
        return NextResponse.json({ success: false, error: 'Failed to reorder questions' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Questions reordered successfully' });
    } else { // Handle single question update
      if (!label || !key || !type) {
        return NextResponse.json({ success: false, error: 'Label, key, and type are required' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('onboarding_questions')
        .update({
          label,
          key_slug: key, // Store as key_slug in DB
          type,
          is_required: is_required || false,
          options: options || [],
          order_index: order_index, // Allow updating order_index for single questions too
        })
        .eq('id', id)
        .eq('community_id', community_id) // Ensure question belongs to this community
        .select()
        .single();

      if (error) {
        console.error('Error updating question:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }
  } catch (error: any) {
    console.error('Unexpected error in PUT /api/questions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const community_id = searchParams.get('community_id');
  const id = searchParams.get('id');

  if (!community_id || !id) {
    return NextResponse.json({ success: false, error: 'Community ID and Question ID are required' }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin
      .from('onboarding_questions')
      .delete()
      .eq('id', id)
      .eq('community_id', community_id); // Ensure question belongs to this community

    if (error) {
      console.error('Error deleting question:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/questions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
