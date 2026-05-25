import { NextResponse, NextRequest } from 'next/server';
import { getModels, removeModels, updateModel, deleteModel } from '@/lib/models-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const models = await getModels();
    return NextResponse.json(models);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const updatedModel = await req.json();
    await updateModel(updatedModel);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (id) {
      await deleteModel(id);
    } else {
      await removeModels();
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
