export function SkeletonVideoItem() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <div className="skeleton h-[30px] w-[52px] shrink-0 rounded-[5px]" />
      <div className="flex-1 space-y-1.5">
        <div className="skeleton h-2.5 w-full rounded-full" />
        <div className="skeleton h-2.5 w-2/3 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonSourceCard() {
  return (
    <div className="flex gap-3 rounded-[14px] border border-white/8 bg-[#191926] p-2.5">
      <div className="skeleton h-[68px] w-[120px] shrink-0 rounded-[8px]" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-3/4 rounded-full" />
        <div className="skeleton h-2.5 w-1/2 rounded-full" />
      </div>
    </div>
  );
}
