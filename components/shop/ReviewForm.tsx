"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { submitReview } from "@/actions/shop";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action] = useActionState(submitReview.bind(null, productId), undefined);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setRating(0);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <p className="font-semibold">Write a review</p>
      <div>
        <span className="label">Your rating</span>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              aria-label={`${i} star${i > 1 ? "s" : ""}`}
            >
              <Star className={cn("h-7 w-7 transition", i <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </div>
      <div>
        <label htmlFor="comment" className="label">Your review</label>
        <textarea id="comment" name="comment" rows={4} className="input" placeholder="What did you like or dislike?" required />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Posting...">Submit review</SubmitButton>
    </form>
  );
}
