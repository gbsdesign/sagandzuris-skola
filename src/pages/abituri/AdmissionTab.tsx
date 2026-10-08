import React from 'react';
import { ExternalLink, FileCheck2, Globe, Heart, Landmark } from 'lucide-react';
import { DOCUMENTS, REASONS } from '../../data/abituriProgram';
import { CARD, Pill, SectionHead, UpdateNotice } from './shared';

// Admission: the documents for the university's own exams, the national exams, and why to study there

export const AdmissionTab: React.FC = () => (
  <div className="space-y-7">
    <UpdateNotice />

    <section>
      <SectionHead title="რეგისტრაცია გამოცდებზე" sub="ორი რეგისტრაცია — შიდა და ეროვნული" />
      <div className="grid gap-3">
        <div className={`${CARD} p-3.5 sm:p-4`}>
          <div className="flex items-start gap-3">
            <span className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028]">
              <FileCheck2 className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-serif-ge text-[16px] font-bold leading-snug text-[#2a2017]">შიდა გამოცდები</h3>
              <p className="mt-0.5 text-[13px] font-semibold text-[#8a7a6a]">უნივერსიტეტში წარსადგენი საბუთები:</p>
            </div>
          </div>
          <ol className="mt-3 space-y-2">
            {DOCUMENTS.map((d, i) => (
              <li key={d} className="flex gap-3 text-[14px] leading-snug text-[#2a2017]">
                <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-[#f3ead9] text-[12px] font-black tabular-nums text-[#8a6a40]">{i + 1}</span>
                <span className="pt-0.5">{d}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className={`${CARD} p-3.5 sm:p-4`}>
          <div className="flex items-start gap-3">
            <span className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028]">
              <Landmark className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-serif-ge text-[16px] font-bold leading-snug text-[#2a2017]">ეროვნული გამოცდები</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-[#3a2d22]">
                ქართულ ენასა და ლიტერატურაზე და ინგლისურ ენაზე რეგისტრირდები ეროვნული გამოცდების საიტიდან.
              </p>
              <div className="mt-3">
                <Pill href="https://naec.ge" icon={<ExternalLink className="w-4 h-4" />}>naec.ge</Pill>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section>
      <SectionHead title="რატომ გალობის უნივერსიტეტი" sub="7 მიზეზი" />
      <ol className={`${CARD} p-3.5 sm:p-4 grid gap-3`}>
        {REASONS.map((r, i) => (
          <li key={i} className="flex gap-3 text-[14.5px] leading-relaxed text-[#2a2017]">
            <span className="shrink-0 w-7 text-right font-serif-ge text-[20px] leading-[1.15] font-bold text-[#c9a66b] tabular-nums">{i + 1}</span>
            <span>{r}</span>
          </li>
        ))}
      </ol>
    </section>

    <figure className="relative rounded-2xl bg-[#7a2028] text-[#fbf6ec] px-5 py-5 sm:px-6 overflow-hidden">
      <Heart className="absolute -right-3 -bottom-4 w-24 h-24 text-white/[0.07]" aria-hidden />
      <blockquote className="relative font-serif-ge text-[16px] leading-relaxed">
        რაც გულით გვინდა, მხოლოდ ის გამოგვდის კარგად. ეს უნივერსიტეტი ჩვენი პატრიარქის დაფუძნებულია და სწავლა უფასოა —
        ვაკეთოთ საღმრთო და ეროვნული საქმე.
      </blockquote>
      <a
        href="https://galoba.edu.ge"
        target="_blank"
        rel="noopener noreferrer"
        className="relative mt-4 inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full bg-[#fbf6ec] text-[#7a2028] text-[13px] font-bold hover:bg-white active:scale-[0.97] transition-all"
      >
        <Globe className="w-4 h-4" /> galoba.edu.ge
      </a>
    </figure>
  </div>
);
