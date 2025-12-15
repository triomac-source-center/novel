import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { createUser } from "@/lib/actions/user.action";

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // ✅ Use req.headers instead of headers()
  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", { status: 400 });
  }

  const { type, data } = evt;

  // CREATE User in MongoDB
  if (type === "user.created") {
    const user = {
      clerkId: data.id,
      email: data.email_addresses[0]?.email_address || null,
      username: data.username || null,
      firstName: data.first_name || null,
      lastName: data.last_name || null,
      photo: data.image_url || null,
    };

    console.log("New user data:", user);

    const newUser = await createUser(user);

    if (newUser) {
      await clerkClient.users.updateUser(data.id, {
        publicMetadata: {
          userId: newUser._id,
        },
      });
    }

    return NextResponse.json({ message: "New user created", user: newUser });
  }

  console.log(`Webhook with ID ${data.id} and type ${type}`);
  console.log("Webhook body:", body);

  return new Response("OK", { status: 200 });
}
