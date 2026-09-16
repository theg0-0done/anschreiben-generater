import { redirect } from "next/navigation";

export default function ProfileIndexPage() {
  redirect("/v2/profile/user");
}
