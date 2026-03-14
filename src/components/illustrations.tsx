import type { CSSProperties } from "react";
export function Icon({
  name,
  size = 20,
}: {
  name:
    | "mail"
    | "paw"
    | "home"
    | "pen"
    | "archive"
    | "arrow"
    | "star"
    | "close"
    | "check"
    | "sun";
  size?: number;
}) {
  const paths = {
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),
    paw: (
      <>
        <ellipse cx="12" cy="16" rx="5" ry="4" />
        <ellipse cx="5" cy="9" rx="2" ry="3" />
        <ellipse cx="10" cy="5" rx="2" ry="3" />
        <ellipse cx="16" cy="6" rx="2" ry="3" />
        <ellipse cx="20" cy="11" rx="2" ry="3" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7v10H3Z" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    pen: (
      <>
        <path d="m14 5 5 5M4 20l5-1L21 7l-4-4L5 15Z" />
      </>
    ),
    archive: (
      <>
        <rect x="3" y="4" width="18" height="5" rx="1" />
        <path d="M5 9v11h14V9m-10 4h6" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    star: <path d="m12 2 3 6 7 2-5 5 1 7-6-3-6 3 1-7-5-5 7-2Z" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m4 12 5 5L20 6" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
export function CatDrawing() {
  return (
    <svg
      viewBox="0 0 220 220"
      role="img"
      aria-label="미리보기용 고양이 일러스트"
    >
      <rect width="220" height="220" fill="#ece5d6" />
      <circle cx="110" cy="113" r="88" fill="#f8f1e3" />
      <path
        d="M54 98 57 43 91 67Q112 58 137 68L169 43 170 107"
        fill="#c5ab88"
        stroke="#79513e"
        strokeWidth="2"
      />
      <path d="m63 56 3 32 17-15m58 0 20-18-1 35" fill="#dda9a0" />
      <ellipse cx="110" cy="116" rx="65" ry="57" fill="#c5ab88" />
      <path
        d="M88 65 99 87m23-22-7 22M51 108l23 7m-21 9 21-2m94-15-23 7m23 10-22-2"
        stroke="#967857"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M75 114q10-10 20 0m30 0q10-10 20 0"
        fill="none"
        stroke="#634a39"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="m104 127 6 6 7-6" fill="#9e7666" />
      <path
        d="M110 133v6m0 0q-9 8-14 0m14 0q9 8 14 0"
        fill="none"
        stroke="#634a39"
        strokeWidth="2"
      />
      <ellipse cx="75" cy="131" rx="10" ry="5" fill="#e0b1a0" />
      <ellipse cx="145" cy="131" rx="10" ry="5" fill="#e0b1a0" />
      <path d="M60 166q48 39 100 0l-5 54H66Z" fill="#c5ab88" />
      <path d="m86 175 24 10 25-10-5 31H91Z" fill="#f9f0dd" />
    </svg>
  );
}
export function Landscape({
  arrived = false,
  compact = false,
}: {
  arrived?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`landscape ${compact ? "compact" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 1100 420" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sky" x2="0" y2="1">
            <stop stopColor="#f3eddb" />
            <stop offset="1" stopColor="#fcf6e8" />
          </linearGradient>
          <pattern
            id="grain"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="2" r=".6" fill="#79513e" opacity=".06" />
          </pattern>
        </defs>
        <rect width="1100" height="420" fill="url(#sky)" />
        <circle cx="775" cy="96" r="39" fill="#edd4a1" opacity=".6" />
        <g fill="#fffdf4" opacity=".85">
          <path d="M123 95q-10-25 16-31 5-31 33-22 27-9 35 20 29-2 28 31Z" />
          <path d="M792 142q-9-18 14-23 1-25 27-24 27-1 31 22 28 0 26 25Z" />
          <path d="M465 64q-8-13 9-20 7-22 26-16 21 0 23 20 23 0 21 16Z" />
        </g>
        <path
          d="M0 287Q140 175 346 285T760 266T1100 262V420H0Z"
          fill="#d1d9b4"
        />
        <path
          d="M0 320Q170 244 406 316T831 294T1100 313V420H0Z"
          fill="#a7ba8a"
        />
        <path d="M0 364Q300 312 565 360T1100 342V420H0Z" fill="#91a875" />
        <path
          d="M556 420q45-61 12-89 18-19 30-12 50 47 62 101"
          fill="#e5d5b6"
        />
        <g stroke="#8b7856" strokeWidth="10" strokeLinecap="round">
          <path d="M140 320V158m0 91-34-36m34 18 33-35M954 317V160m0 89-33-25m33-1 32-29" />
        </g>
        <g fill="#81996c">
          <ellipse cx="138" cy="150" rx="66" ry="78" />
          <ellipse cx="101" cy="185" rx="39" ry="50" />
          <ellipse cx="178" cy="191" rx="38" ry="48" />
          <ellipse cx="952" cy="150" rx="54" ry="74" />
          <ellipse cx="917" cy="190" rx="38" ry="43" />
          <ellipse cx="989" cy="191" rx="31" ry="44" />
        </g>
        <g fill="#a7b785">
          <ellipse cx="128" cy="132" rx="40" ry="50" />
          <ellipse cx="945" cy="134" rx="34" ry="48" />
        </g>
        <g fill="#f2e7bb">
          <circle cx="103" cy="174" r="4" />
          <circle cx="163" cy="124" r="4" />
          <circle cx="157" cy="205" r="4" />
          <circle cx="955" cy="111" r="4" />
          <circle cx="990" cy="181" r="4" />
        </g>
        <g className={arrived ? "mailbox arrived" : "mailbox"}>
          <path d="M549 255h17v96h-17" fill="#8b6750" />
          <path
            d="M511 233v-39q0-31 33-31h53q28 0 28 31v39Z"
            fill="#b96950"
            stroke="#87543f"
            strokeWidth="2"
          />
          <path
            d="M511 233v-39q0-31 30-31 28 0 28 31v39Z"
            fill="#ce8c6b"
            stroke="#87543f"
            strokeWidth="2"
          />
          <path
            d="M524 204h33"
            stroke="#754a37"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M600 191v-52h25v16h-22"
            fill="#dbba76"
            stroke="#87543f"
            strokeWidth="3"
          />
          <path d="M520 242h99v12h-99Z" fill="#79513e" />
          {arrived && (
            <g className="floating-letter">
              <path
                d="m532 183 42-8 6 31-42 8Z"
                fill="#fff9e8"
                stroke="#987f60"
              />
              <path d="m534 185 24 12 18-19" fill="none" stroke="#bc9672" />
              <path d="m546 192 5 3 4-5 2 8-7 4" fill="#b96950" />
            </g>
          )}
        </g>
        <g transform="translate(665 292)">
          <path
            d="M30 34q15-23 19-10t-10 30"
            fill="none"
            stroke="#bd9c76"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <ellipse cx="21" cy="38" rx="20" ry="25" fill="#c7a57d" />
          <path d="M0 18-2-9 15 2 31-9 34 18Z" fill="#c7a57d" />
          <ellipse cx="17" cy="17" rx="20" ry="18" fill="#c7a57d" />
          <path d="m6 15 6 1m11 0 5-2" stroke="#79513e" strokeWidth="2" />
          <path d="m15 23 3 3 3-3" fill="#79513e" />
        </g>
        {Array.from({ length: 24 }, (_, i) => {
          const x = 35 + ((i * 83) % 1050);
          const y = 345 + ((i * 31) % 67);
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d="M0 0v12m0-6 5-4" stroke="#718958" strokeWidth="1.5" />
              <g fill={i % 3 === 0 ? "#dfac86" : "#f8f1d6"}>
                <circle cy="-4" r="3" />
                <circle cx="4" r="3" />
                <circle cy="4" r="3" />
                <circle cx="-4" r="3" />
              </g>
              <circle r="2" fill="#cfb264" />
            </g>
          );
        })}
        <rect width="1100" height="420" fill="url(#grain)" />
      </svg>
      <span className="scene-caption">마음이 머무는 곳, 고별 우체국</span>
    </div>
  );
}
export function Stamp({ style }: { style?: CSSProperties }) {
  return (
    <span className="stamp" style={style}>
      <Icon name="paw" size={25} />
      <span>고별 우체국</span>
      <small>WITH LOVE</small>
    </span>
  );
}
