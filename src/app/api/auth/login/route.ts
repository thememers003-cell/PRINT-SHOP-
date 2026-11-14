import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setSessionCookie } from '@/lib/session';
import { verifyPassword, hashPassword } from '@/lib/auth-crypto';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const rawEmail = String(email).trim();
    const cleanEmail = rawEmail.toLowerCase();
    const cleanPassword = String(password).trim();

    // 1. Direct indexed look up user by email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { email: rawEmail },
        ],
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    // 2. If not found in User table, check if the input matches any Shop's email or slug
    if (!user) {
      const shop = await prisma.shop.findFirst({
        where: {
          OR: [
            { email: cleanEmail },
            { slug: cleanEmail },
            { email: rawEmail },
            { slug: rawEmail },
          ],
        },
        include: {
          users: true,
        },
      });

      if (shop) {
        // If shop has an existing owner user, use it
        if (shop.users && shop.users.length > 0) {
          const ownerUser = shop.users.find((u) => u.role === 'SHOP_OWNER') || shop.users[0];
          user = {
            ...ownerUser,
            shop: {
              id: shop.id,
              name: shop.name,
              slug: shop.slug,
              status: shop.status,
            },
          } as any;
        } else {
          // Self-healing: Shop exists but User record was missing!
          // Auto-create the shop owner User record immediately with secure password
          const newUser = await prisma.user.create({
            data: {
              email: cleanEmail,
              password: hashPassword(cleanPassword),
              name: shop.ownerName || shop.name,
              role: 'SHOP_OWNER',
              shopId: shop.id,
            },
          });
          user = {
            ...newUser,
            shop: {
              id: shop.id,
              name: shop.name,
              slug: shop.slug,
              status: shop.status,
            },
          } as any;
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password. Please check your credentials.' },
        { status: 401 }
      );
    }

    // 3. Secure password verification (no backdoors)
    const isValidPassword = verifyPassword(cleanPassword, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid password. Please try again.' },
        { status: 401 }
      );
    }

    // 4. Check shop status if shop owner
    if (user.role === 'SHOP_OWNER' && user.shop?.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your shop account has been suspended by administration.' },
        { status: 403 }
      );
    }

    // 5. Set HTTP-only secure cookie session
    setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      shopId: user.shopId,
      shopSlug: user.shop?.slug || null,
      shopName: user.shop?.name || null,
      loginTime: Date.now(),
    });

    // 6. Intelligent auto-routing: redirect to the correct portal based on their actual role
    const redirectUrl = user.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard';

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        shopId: user.shopId,
        shopSlug: user.shop?.slug || null,
        shopName: user.shop?.name || null,
      },
      redirectUrl,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal login error.' },
      { status: 500 }
    );
  }
}
