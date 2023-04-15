"use client";

import { fetcher } from "@/util/fetcher";
import { useEffect } from "react";
import useSWR from "swr";
import { formatDuration } from "@/util/format-duration";

type Monologue = {
  elements: Cue[];
  speaker: number;
};
type Cue = {
  type: "text" | "punct";
  value?: string;
  ts?: number;
  end_ts?: number;
  confidence?: number;
};

type Transcript = {
  monologues: Monologue[];
};

export function Transcript({
  url,
  onCueClick,
  playerRef,
}: {
  url: string;
  onCueClick?: (time: number) => void;
  playerRef: any;
}) {
  const { data, error } = useSWR(url, fetcher);

  useEffect(() => {
    // crate flat word list
    const words = data?.monologues
      ? data.monologues.reduce((acc: any, block: Monologue) => {
          return block.elements.reduce((acc2: any, el: Cue) => {
            if (el.ts) acc2.push(el);
            return acc2;
          }, acc);
        }, [])
      : [];

    const onTimeUpdate = () => {
      // `text` class is coming from the transcript type
      const wordNodes = document.getElementsByClassName(
        "text"
      ) as HTMLCollectionOf<HTMLElement>;
      const hl = document.getElementById("highlighter");
      const bhl = document.getElementById("block-highlighter");
      const activeIndex = words.findIndex((word: any) => {
        return (
          word.ts >= playerRef.current.currentTime &&
          playerRef.current.currentTime <= word.end_ts
        );
      });

      const active = wordNodes[activeIndex];
      const parent = active?.parentElement;
      if (hl && bhl && active && parent) {
        hl.style.display = "inline-block";
        hl.style.top = `${active.offsetTop - 4}px`;
        hl.style.left = `${active.offsetLeft - 4}px`;
        hl.style.width = `${active.offsetWidth + 8}px`;
        hl.style.height = `${active.offsetHeight + 8}px`;
        hl.textContent = words[activeIndex].value;

        bhl.style.display = "inline-block";
        bhl.style.top = `${parent.offsetTop - 4}px`;
        bhl.style.left = `${parent.offsetLeft - 4}px`;
        bhl.style.width = `${parent.offsetWidth + 8}px`;
        bhl.style.height = `${parent.offsetHeight + 8}px`;
      }
    };

    if (playerRef && playerRef.current) {
      playerRef.current.addEventListener("timeupdate", onTimeUpdate);
    }

    return () => {
      if (playerRef && playerRef.current) {
        return playerRef.current.removeEventListener(
          "timeupdate",
          onTimeUpdate
        );
      }
    };
  }, [data, playerRef.current]);

  const handleCueClick = (time: number) => {
    if (onCueClick) onCueClick(time - 0.5);
  };

  if (error) return null;
  if (!data) return <p>loading</p>;

  if (data.monologues.length < 1) {
    return null;
  }

  return (
    <div className="relative">
      <h2 className="font-bold text-2xl mb-10">
        Transcript <span>(auto-generated)</span>
      </h2>
      <span
        id="highlighter"
        className="absolute pl-1 pt-0.5 rounded-sm text-xl transition-all duration-75 w-12 text-white bg-primary z-20 hidden"
      />
      <span
        id="block-highlighter"
        className="absolute pl-1 pt-0.5 rounded-sm transition-all duration-75 bg-primary bg-opacity-20 z-10 hidden"
      />
      <div className="text-xl">
        {data.monologues.map((block: any, id: number) => {
          return (
            <div
              key={`s_${block.speaker}_id_${id}`}
              className="mb-8 leading-normal"
            >
              {/*<div className="w-48"><strong>Speaker {block.speaker}:</strong></div>*/}
              <div
                className="mb-2"
                onClick={() => handleCueClick(block.elements[0].ts)}
              >
                <strong className="cursor-pointer hover:text-primary">
                  Speaker {block.speaker} [
                  {formatDuration(block.elements[0].ts)}]
                </strong>
              </div>
              <p className="paragraph">
                {block.elements.map((el: any, id: number) => {
                  return (
                    <span
                      key={`ts_${el.ts || `${el.value}-${id}`}`}
                      className={`${el.type} cursor-pointer hover:text-primary`}
                      data-ts={el.ts}
                      data-end-ts={el.end_ts}
                      onClick={() => handleCueClick(el.ts)}
                    >
                      {el.value}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
