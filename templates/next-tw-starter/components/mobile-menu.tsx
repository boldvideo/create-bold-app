"use client";

import { useState } from "react";
import Image from "next/image";

import logo from "../public/acmenet.png";
import Link from "next/link";

type MenuItem = {
  url: string;
  label: string;
};

type Props = { menuItems: Array<MenuItem> };

export function MobileMenu({ menuItems }: Props) {
  const [isMobileMenu, setIsMobileMenu] = useState(false);

  return (
    <>
      <button
        type="button"
        className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
        onClick={() => setIsMobileMenu(true)}
      >
        <span className="sr-only">Open main menu</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </button>
      {isMobileMenu ? (
        <div className="">
          <div className="fixed inset-0 z-50" />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-5 py-4 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <Link href="/" className="">
                <Image
                  src={logo}
                  alt="acmenet Mediahub"
                  className="h-12 md:h-20 object-contain object-left"
                />
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setIsMobileMenu(false)}
              >
                <span className="sr-only">Close menu</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="space-y-2 py-6">
                {menuItems.map((item: any) => (
                  <Link
                    key={item.url}
                    href={item.url}
                    onClick={() => setIsMobileMenu(false)}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
