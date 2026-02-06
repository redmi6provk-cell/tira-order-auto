import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8005";

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ path: string[] }> }
) {
    const fullPath = request.nextUrl.pathname.replace(/^\/api\/proxy/, "");
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${BACKEND_URL}/api${fullPath}${searchParams ? `?${searchParams}` : ""}`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": request.headers.get("Authorization") || "",
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Proxy GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch from backend" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ path: string[] }> }
) {
    const fullPath = request.nextUrl.pathname.replace(/^\/api\/proxy/, "");
    const url = `${BACKEND_URL}/api${fullPath}`;

    try {
        const body = await request.arrayBuffer();
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": request.headers.get("Content-Type") || "application/json",
                "Authorization": request.headers.get("Authorization") || "",
            },
            body: body,
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Proxy POST Error:", error);
        return NextResponse.json(
            { error: "Failed to post to backend" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ path: string[] }> }
) {
    const fullPath = request.nextUrl.pathname.replace(/^\/api\/proxy/, "");
    const url = `${BACKEND_URL}/api${fullPath}`;

    try {
        const body = await request.arrayBuffer();
        const response = await fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": request.headers.get("Content-Type") || "application/json",
                "Authorization": request.headers.get("Authorization") || "",
            },
            body: body,
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Proxy PUT Error:", error);
        return NextResponse.json(
            { error: "Failed to put to backend" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ path: string[] }> }
) {
    const fullPath = request.nextUrl.pathname.replace(/^\/api\/proxy/, "");
    const url = `${BACKEND_URL}/api${fullPath}`;

    try {
        const response = await fetch(url, {
            method: "DELETE",
            headers: {
                "Authorization": request.headers.get("Authorization") || "",
            }
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error("Proxy DELETE Error:", error);
        return NextResponse.json(
            { error: "Failed to delete from backend" },
            { status: 500 }
        );
    }
}
