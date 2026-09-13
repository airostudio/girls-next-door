import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isOwnerType, ownerColumn, ownerTable, type OwnerType } from '@/lib/media'

/**
 * Validates the {ownerType, ownerId} pair from the URL and confirms the record
 * exists. Every media route starts here, so an unknown owner type can never
 * reach a query — the column name is looked up from a fixed map rather than
 * interpolated from the path.
 */
export async function resolveOwner(ownerType: string, ownerId: string): Promise<
  | { ok: true; type: OwnerType; column: string }
  | { ok: false; response: NextResponse }
> {
  if (!isOwnerType(ownerType)) {
    return { ok: false, response: NextResponse.json({ error: 'Unknown owner type' }, { status: 404 }) }
  }
  const { data } = await supabase.from(ownerTable(ownerType)).select('id').eq('id', ownerId).single()
  if (!data) {
    return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  }
  return { ok: true, type: ownerType, column: ownerColumn(ownerType) }
}
