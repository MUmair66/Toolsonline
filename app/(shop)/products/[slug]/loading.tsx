import { Bone } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="container-x py-8">
      <Bone className="mb-6 h-4 w-72" />
      <div className="grid gap-10 lg:grid-cols-2">
        <Bone className="aspect-square rounded-2xl" />
        <div>
          <Bone className="h-4 w-24" />
          <Bone className="mt-3 h-10 w-4/5" />
          <Bone className="mt-4 h-5 w-40" />
          <Bone className="mt-6 h-9 w-32" />
          <Bone className="mt-6 h-24 w-full" />
          <Bone className="mt-8 h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
