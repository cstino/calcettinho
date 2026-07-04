import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(req: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const { email: emailParam } = await params;
    const email = decodeURIComponent(emailParam);

    const { data, error } = await supabase
      .from('whitelist')
      .select('role')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: 'Utente non autorizzato',
          role: null,
          isAdmin: false,
          isReferee: false,
          hasMatchManagementPrivileges: false,
        },
        { status: 403 }
      );
    }

    const role = data.role || 'user';
    const isAdmin = role.toLowerCase() === 'admin';
    const isReferee = role.toLowerCase() === 'arbitro';
    const hasMatchManagementPrivileges = isAdmin || isReferee;

    return NextResponse.json({
      success: true,
      email,
      role,
      isAdmin,
      isReferee,
      hasMatchManagementPrivileges,
      message: `Utente ${email} ha ruolo: ${role}`,
    });
  } catch (error) {
    console.error('Errore nel controllo ruolo:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Errore interno del server',
        details: error instanceof Error ? error.message : 'Errore sconosciuto',
        role: null,
        isAdmin: false,
        isReferee: false,
        hasMatchManagementPrivileges: false,
      },
      { status: 500 }
    );
  }
}
