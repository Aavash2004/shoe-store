import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/authorization";

export async function GET() {
  const authResult = await requireAdminApi();
  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  return NextResponse.json({
    message: "Admin products API endpoint authorized",
    user: {
      id: authResult.session.user.id,
      email: authResult.session.user.email,
      role: authResult.session.user.role,
    },
  });
}
