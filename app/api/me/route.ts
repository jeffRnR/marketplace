import { auth, currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await connectDB();

  let user = await User.findOne({ clerkId: userId });

  if (!user) {
    const clerkUser = await currentUser();
    user = await User.create({
      clerkId: userId,
      email: clerkUser?.emailAddresses[0]?.emailAddress,
      name: `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim(),
    });
  }

  return Response.json(user);
}
